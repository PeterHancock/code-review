(function(){
    var global = this;
    var project;
    var Project = function(firebase) {
        this._projectRef = firebase;
        this._projectDataRef = firebase.child('data');
        this._constraints = {};
    };
    Project.prototype.load = function() {
        var scope = this;
        this._projectRef.child('details').once('value', function(snapshot) {
            var details = snapshot.val();
            $('.project-org').text(details.org);
            $('.project-name').text(details.name);
        });
        this._projectDataRef.on('value', function(snapshot) {
            var data = snapshot.val();
            scope._reviewers = _(data.reviewers).values() || [];
            scope._history = _(data.history).values().reverse() || [];
            scope._sortReviewers();
            scope.trigger('change');
        });

    };
    (function(){

        this.getHistory = function() {
            return this._history;
        }

        this.generate = function() {
            var active = this.getActiveReviewers();
            this._generated = shuffle(_(active).pluck('name'), this._history, _.clone(this._constraints));
            this.trigger('generate');
        }
        this._sortReviewers = function() {
            this._reviewers = _.sortBy(this._reviewers, function(reviewer) {return reviewer.name.slice(-1)});
        }
        this.commit = function() {
            if (this._generated) {
                var gen = this._generated;
                this._generated = null;
                this._current = 'placeholder'; //TODO need a better race condition guard!
                var revs = _(this._reviewers).reduce(function(memo, reviewer) {
                    memo[reviewer.name] = reviewer.active;
                    return memo;
                }, {});
                this._projectDataRef.child('reviewers').transaction(function(reviewers){
                   return _(reviewers).map(function(reviewer){
                      return {name: reviewer.name, active: revs[reviewer.name]};
                   });
                });
                this._current = this._projectDataRef.child('history').push(gen);
            }
        }

        this.revert = function() {
            if  (this.canRevert()) {
                var current = this._current;
                this._current = null;
                current.remove();
            }
        }

        this.canRevert = function() {
           return this._current ? true : false;
        }

        this.addConstraint = function(reviewerName, revieweeName) {
            var scope = this;
            _(this._constraints).find(function(v, k){
                if (v == revieweeName) {
                    delete scope._constraints[k];
                    return true;
                }
                return false;
            });
            this._constraints[reviewerName] = revieweeName;
            this.trigger('change');
        }

        this.removeConstraint = function(reviewerName) {
            delete this._constraints[reviewerName];
            this.trigger('change');
        }

        this.hasConstraint = function (reviewerName) {
            return this._constraints[reviewerName] ? true : false;
        }

        this.getReviewers = function() {
            return this._reviewers;
        }

        this.getActiveReviewers = function() {
            return _(this.getReviewers()).filter(function(reviewer){ return reviewer.active; });
        }

        this.toggleReviewer = function(reviewer) {
            if (reviewer.active) {
                this.removeConstraint(reviewer.name);
                var pair = _.chain(this._constraints).pairs()
                            .find(function(pair){ return pair[1] == reviewer.name; })
                            .value();
                if (pair) {
                    this.removeConstraint(pair[0]);
                }
            }
            reviewer.active = ! reviewer.active;
            this.trigger('change');
        }

        this.addReviewer = function(name) {
            if(_(this._reviewers).find(function(reviewer){ return reviewer.name == name; })) {
                var message = 'Reviewer ' + name + ' already exists!';
                this.trigger('error', message);
                throw message;
            }
            this._projectDataRef.child('reviewers').push({name: name, active: true});
        }

        this.codeReviewTable = function() {
            return _(this._generated).reduce(function(memo, loop) {
                _.chain(loop).rest().reduce(function(reviewer, reviewee) {
                    memo[reviewer] = reviewee;
                    return reviewee;
                }, _(loop).first());
                memo[_(loop).last()] = _(loop).first();
                return memo;
            }, {});
        }

        _(this).extend(Backbone.Events);

    }).call(Project.prototype);


    // View logic
    function renderGenerate() {
        var tbody = $('<tbody></tbody>');
        var reviewTable = project.codeReviewTable();
        var revieweeTemplate = Mustache.compile($('#reviewee-tmpl').html());
        _(project.getReviewers()).each(function(reviewer){
            row = $('<tr></tr>');
            tbody.append(row);
            var reviewerCell = $('<td/>');
            var reviewerButton = $('<button class="btn btn-default">' + reviewer.name  + '</button>')
            row.append(reviewerCell);
            reviewerCell.append(reviewerButton);
            reviewerButton.click(function() {
                project.toggleReviewer(reviewer);
            });
            var devCell =  $('<td/>');
            row.append(devCell);
            if (reviewer.active) {
                var reviewee = reviewTable[reviewer.name];
                var others = _.chain(project.getActiveReviewers()).filter(function(r){
                        return r.name != reviewer.name && r.name != reviewee;
                }).value();
                var devButton = $(revieweeTemplate({reviewee: reviewee, others: others}));
                devCell.append(devButton);
                reviewerButton.attr('title', 'Remove ' + reviewer.name + ' from next Sprint')
                var pinButton = devButton.find('.pin');
                if (project.hasConstraint(reviewer.name)) {
                    pinButton.addClass('btn-warning');
                }
                pinButton.click(function(e) {
                    e.preventDefault();
                    pinButton.toggleClass('btn-warning');
                    if (project.hasConstraint(reviewer.name)) {
                        project.removeConstraint(reviewer.name);
                    } else {
                        project.addConstraint(reviewer.name, reviewee);
                    }
                });
                _.chain(others).pluck('name').each(function(name) {
                    devButton.find('.pin-to-' + name).click(function(e) {
                        e.preventDefault();
                        project.addConstraint(reviewer.name, name);
                    });
                });
            } else {
                reviewerButton.attr('title', 'Add ' + reviewer.name + ' to next Sprint')
                        .addClass('btn-warning')
            }
            reviewerButton.tooltip();
        });
        $('#review tbody').replaceWith(tbody);
    }

    function renderCurrent() {
        var history = project.getHistory();
        var currentEl = $('#current');
        currentEl.empty();
        var historyLength = history.length;
        $('#sprint-number').text(historyLength);
        if(historyLength > 0) {
            var current = $('<h2>' + formatSprint(_(history).first()) + '</h2>');
            currentEl.append(current);
            if(project.canRevert()) {
                var removeBtn = $('<button class="btn btn-danger pull-right" title="Revert Sprint"><span class="glyphicon glyphicon-remove"></span></button>');
                current.append(removeBtn);
                removeBtn.click(_(project.revert).bind(project));
                removeBtn.tooltip();
            }
        } else {
            currentEl.append('<div class="alert alert-info">There is no Active Sprint</div>');
        }
    }

    function renderHistory() {
        var history = project.getHistory();
        var historyEl = $('#history');
        historyEl.empty();
        var histLength = history.length;
        if (histLength) {
            _(history).each(function(sprint, i) {
                var markup = '<strong>' + (histLength - i) + '</strong> ' +formatSprint(sprint);
                historyEl.append('<li class="list-group-item" style="font-size:1.5em">' + markup + '</li>');
            });
        } else {
            historyEl.append('<div class="alert alert-info">There is no Sprint History</div>');
        }
    }

    function renderAdmin(users, projectId, user) {
        console.log('Project owner can access the users:', users);
        var inviteLinkTmpl = window.location.href.split('#')[0] + '#action=invite&uuid={{uuid}}&id={{id}}&provider={{provider}}&projectId={{projectId}}'
        var inviteLink = encodeURIComponent(Mustache.render(inviteLinkTmpl, {projectId: projectId, uuid: user.uuid, id: user.id, provider: user.provider}));
        $('#invite').attr('href', 'mailto:?Subject=Invite&body=' + inviteLink).text('invite');
        if (users) {
            var $_users = $('#users');
            _(users).each(function(permissions, name){
                var perm = '' + (permissions.write ? '(write access)' : '');
                $('<li class="list-group-item">' ).text(name  + ' ' + perm).appendTo($_users);
            });
        }
        $('#admin').show();
    }

    function renderPage() {
        renderCurrent();
        renderHistory();
        project.generate();
    }

    function renderErrorMessage(message) {

        var msg = $(Mustache.render($('#error-message-tmpl').html(), {message: message})).appendTo($('#error-messages'));
        msg.find('.close').click(function(e){
            e.preventDefault();
            msg.remove();
        });
    }

    function formatSprint(sprint) {
        return _(sprint).map(function(loop) {
            var loop = _.clone(loop);
            loop.push(_(loop).head());
            var loopHtml = _(loop).map(function(item) {return '<span>' + item + '</span>'})
                    .join('<span class="glyphicon glyphicon-arrow-right"></span>');
            return '<span class="label label-default">' + loopHtml + '</span>';
        }).join('    ');
    }

    function renderProject(firebase, el, projectDetails, user) {
        var name = projectDetails.name;
        var projectId = projectDetails.id;
        $(el).load('html/project/project.html', function(){
            project = global.project = new Project(firebase);
            var setupWriteAccess = function() {
                project.on('generate', renderGenerate);
                     $('#reshuffle').click(function(){
                    project.generate();
                });
                $('#commit').click(function(){
                    project.commit();
                });
                $('#create-developer-form').submit(function(e) {
                    e.preventDefault();
                    $('#addReviewer').modal('hide');
                    var name = $('#developer-name').val();
                    $('#developer-name').val('');
                    project.addReviewer(name);
                });
                $('#generate').show();
            }

            // Only the project owner has access to the users
            firebase.child('users').once('value', function(s){
                var users = s.val();
                renderAdmin(users, projectId, user);
                setupWriteAccess();
            });

            firebase.child('users/' + user.id + ':' + user.provider).once('value', function(s){
                var permission = s.val();
                // Only project watchers have an entry in the project users list
                if (permission) {
                    console.log('Project watcher has permissions', permission);
                    if (permission.write === true) {
                         setupWriteAccess();
                    }
                }
            });
            project.on('change', renderPage);
            project.on('error', renderErrorMessage);
            $('.project-name').text(name);

            $('.btn').each(function(i, e) {
                $(e).tooltip();
            });
            project.load();
        });
    }
    function createProject(firebase, org, name) {
        firebase.push({
            details: {
                name: name,
                org: org
            }
        });
    }

    this.renderProject = renderProject;

    this.createProject = createProject;

}).call(this);
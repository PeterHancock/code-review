(function(){
    var CodeReviews = function(firebase) {
        this._firebase = firebase;
        this._constraints = {};
        var scope = this;
        var broadcastChange = _.after(2, function(){
            scope.trigger('change');
        });
        firebase.child('reviewers').on('value', function(snapshot) {
            scope._reviewers = _(snapshot.val()).values() || [];
            scope._sortReviewers();
            broadcastChange();
        });
        firebase.child('history').on('value', function(snapshot) {
            scope._history = _(snapshot.val()).values().reverse() || [];
            broadcastChange();
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
                this._current = this._firebase.child('history').push(gen);
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
            this._constraints[reviewerName] = revieweeName;
            this.trigger('change');
        }

        this.removeConstraint = function(reviewerName) {
            delete this._constraints[reviewerName];
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
            this._firebase.child('reviewers').push({name: name, active: true});
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

    }).call(CodeReviews.prototype);


    // View logic
    function renderGenerate() {
        var tbody = $('<tbody></tbody>');
        var reviewTable = codeReview.codeReviewTable();
        var revieweeTemplate = Mustache.compile($('#reviewee-tmpl').html());
        _(codeReview.getReviewers()).each(function(reviewer){
            row = $('<tr></tr>');
            tbody.append(row);
            var reviewerCell = $('<td/>');
            var reviewerButton = $('<button class="btn btn-default">' + reviewer.name  + '</button>')
            row.append(reviewerCell);
            reviewerCell.append(reviewerButton);
            reviewerButton.click(function() {
                codeReview.toggleReviewer(reviewer);
            });
            var devCell =  $('<td/>');
            row.append(devCell);
            if (reviewer.active) {
                var reviewee = reviewTable[reviewer.name];
                var others = _.chain(codeReview.getActiveReviewers()).filter(function(r){
                        return r.name != reviewer.name && r.name != reviewee;
                }).value();
                var devButton = $(revieweeTemplate({reviewee: reviewee, others: others}));
                devCell.append(devButton);
                reviewerButton.attr('title', 'Remove ' + reviewer.name + ' from next Sprint')
                var pinButton = devButton.find('.pin');
                if (codeReview.hasConstraint(reviewer.name)) {
                    pinButton.addClass('btn-warning');
                }
                pinButton.click(function(e) {
                    e.preventDefault();
                    pinButton.toggleClass('btn-warning');
                    if (codeReview.hasConstraint(reviewer.name)) {
                        codeReview.removeConstraint(reviewer.name);
                    } else {
                        codeReview.addConstraint(reviewer.name, reviewee);
                    }
                    codeReview.trigger('change');

                });
                _.chain(others).pluck('name').each(function(name) {
                    devButton.find('.pin-to-' + name).click(function(e) {
                        e.preventDefault();
                        codeReview.addConstraint(reviewer.name, name);
                       renderGenerate();
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
        var history = codeReview.getHistory();
        var currentEl = $('#current');
        currentEl.empty();
        var historyLength = history.length;
        $('#sprint-number').text(historyLength);
        if(historyLength > 0) {
            var current = $('<h2>' + formatSprint(_(history).first()) + '</h2>');
            currentEl.append(current);
            if(codeReview.canRevert()) {
                var removeBtn = $('<button class="btn btn-danger pull-right" title="Revert Sprint"><span class="glyphicon glyphicon-remove"></span></button>');
                current.append(removeBtn);
                removeBtn.click(_(codeReview.revert).bind(codeReview));
                removeBtn.tooltip();
            }
        } else {
            currentEl.append('<div class="alert alert-info">There is no Active Sprint</div>');
        }
    }

    function renderHistory() {
        var history = codeReview.getHistory();
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

    function renderPage() {
        renderCurrent();
        renderHistory();
        codeReview.generate();
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

    function init(firebase, el, name) {
        $(el).load('html/project/project.html', function(){
            codeReview = this.codeReview = new CodeReviews(firebase);
            codeReview.on('change', renderPage);
            codeReview.on('generate', renderGenerate);
            codeReview.on('error', renderErrorMessage);
            $('.project-name').text(name);
            $('#reshuffle').click(function(){
                codeReview.generate();
            });
            $('#commit').click(function(){
                codeReview.commit();
            });
            $('#create-developer-form').submit(function(e) {
                e.preventDefault();
                $('#addReviewer').modal('hide');
                var name = $('#developer-name').val();
                $('#developer-name').val('');
                codeReview.addReviewer(name);
            });
            $('.btn').each(function(i, e) {
                $(e).tooltip();
            });
        });
    }

    this.renderProject = init;

}).call(this);
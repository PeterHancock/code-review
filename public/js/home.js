(function() {
    var renderHome = function(app, main) {
        var firebaseRef = app._firebaseRef;
        var user = app._user;
        var messageService = app._messageService;
        var userNode = firebaseRef.getUserRef(user);
        main.load('html/home/home.html', function() {
            var messagesList = main.find('.messages')
            var updateMessagesHeader = _(
                function(){
                    main.find('.messages-body').text('Your messages');
                }
            ).once();
            var createMessage = function(){
                return $('<li class="list-group-item">').appendTo(messagesList)
            }
            messageService.on('message_added', function(message) {
                updateMessagesHeader();
                switch (message.message.type) {
                case 'subscribe':
                    userNode.child('projects/' + message.message.project + '/details').on('value', function(s) {
                        var projectDetails = s.val();
                        _(message.message).extend(projectDetails);
                        $('<a> Let ' + message.from.email + ' join ' + projectDetails.name + '</a>').appendTo(createMessage()).click(_.once(function(e) {
                            e.preventDefault();
                            messageService.reply(message, {
                                type: "accept",
                                project: {
                                    id: message.message.project,
                                    name: message.message.name,
                                    org: message.message.org,
                                    user: {
                                        id: user.id,
                                        provider: user.provider
                                    }
                                }
                            });
                            firebaseRef.getUserRef(user).child('projects/' + message.message.project + '/users/' + firebaseRef.getId(message.from) + '/read').set(true);
                            $(this).remove();
                            message.remove();
                        }));
                    });

                    break;
                case 'accept':
                    firebaseRef.getUserRef(user).child('private/subscribed-projects').push(message.message.project);
                    message.remove();
                    break;
                default:
                    createMessage().text('From:' + message.from.email + 'Message:' + message.message);
                }
            });

            main.find('.my-projects').empty();
            var updateMyProjectsHeader = _(function(){
                main.find('.my-projects-body').text('Projects owned my you');
            }).once();
            userNode.child('projects').on('child_added', function(snapshot) {
                updateMyProjectsHeader();
                var project = snapshot.val();
                var projectDetail = {
                    id: snapshot.name(),
                    org: project.details.org,
                    name: project.details.name
                };
                $('<li class="list-group-item">').append(projectLink(app, projectDetail, user))
                    .append(inviteLink(projectDetail, user))
                    .appendTo(main.find('.my-projects'));
            });
            main.find('.add-project-link').click(function(e){
                var modal = main.find('.add-project-modal');
                modal.find('.create-project').click(function(e){
                   //TODO validate project
                   createProject(userNode.child('projects'), $('#inputOrg').val(), $('#inputName').val());
                   modal.modal('hide');
                });
                modal.modal('show');
            });
             var updateSubscribedProjectsHeader = _(function(){
                main.find('.subscribed-projects-body').text('Projects you watch');
            }).once();
            main.find('.subscribed-projects').empty();
            userNode.child('private/subscribed-projects').on('child_added', function(snapshot) {
                updateSubscribedProjectsHeader();
                var project = snapshot.val();
                $('<li class="list-group-item">').append(projectLink(app, project, project.user)).appendTo(main.find('.subscribed-projects'));
            });
            messageService.listen();
        });
    }

    function projectLink(app, project, user) {
        return app.appLink('<a class="fragnav" href="#action=project&projectId=' + project.id + '&id=' + user.id + '&provider=' + user.provider + '">' + project.org + '/' + project.name + '</a>');
    }
    function inviteLink(project, user) {
        var inviteLinkTmpl = window.location.href.split('#')[0] + '#action=invite&uuid={{uuid}}&id={{id}}&provider={{provider}}&projectId={{projectId}}'
        var inviteLink = encodeURIComponent(Mustache.render(inviteLinkTmpl, {projectId: project.id, uuid: user.uuid, id: user.id, provider: user.provider}));
        return $('<a href="mailto:?Subject=Invite&body=' + inviteLink + '"><span class="glyphicon glyphicon-user"></span</a>');
    }

    this.renderHome = renderHome;
}).call(this);
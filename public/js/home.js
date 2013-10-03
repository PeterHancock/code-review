(function() {
    var renderHome = function(app, main) {
        var firebaseRef = app._firebaseRef;
        var user = app._user;
        var messageService = app._messageService;
        var userNode = firebaseRef.getUserRef(user);
        main.load('html/home/home.html', function() {
            messageService.on('message_added', function(message) {
                switch (message.message.type) {
                case 'subscribe':
                    userNode.child('projects/' + message.message.project + '/details').on('value', function(s) {
                        var projectDetails = s.val();
                        _(message.message).extend(projectDetails);
                        $('<p><a> Let ' + message.from.email + ' join ' + projectDetails.name + '</a></p>').appendTo(main.find('.messages')).click(_.once(function(e) {
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
                    main.find('.messages').append('<p> From:' + message.from.email + 'Message:' + message.message + '</p>');
                }
            });

            main.find('.my-projects').empty();
            userNode.child('projects').on('child_added', function(snapshot) {
                var project = snapshot.val();
                var projectDetail = {
                    id: snapshot.name(),
                    org: project.details.org,
                    name: project.details.name
                };
                $('<p>').append(projectLink(app, projectDetail, user)).appendTo(main.find('.my-projects'));
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
            main.find('.subscribed-projects').empty();
            userNode.child('private/subscribed-projects').on('child_added', function(snapshot) {
                var project = snapshot.val();
                $('<p>').append(projectLink(app, project, project.user)).appendTo(main.find('.subscribed-projects'));
            });
            messageService.listen();
        });
    }

    function projectLink(app, project, user) {
        return app.appLink('<a class="fragnav" href="#action=project&projectId=' + project.id + '&id=' + user.id + '&provider=' + user.provider + '">' + project.org + '/' + project.name + '</a>');
    }

    this.renderHome = renderHome;
}).call(this);
(function(){
    var MessageService = function(firebaseRef, user) {
        this._firebaseRef = firebaseRef;
        this._user = user;
        _(this).bindAll('handleMessageAdded', 'handleMessageRemoved');
    };
    _(MessageService.prototype).extend(Backbone.Events);
    _(MessageService.prototype).extend({
        listen: function() {
            var messagesRef = this._firebaseRef.child('users/' + this._user.id + '/messages');
            messagesRef.on('child_added', this.handleMessageAdded);
            messagesRef.on('child_removed', this.handleMessageRemoved);
        },
        send: function(to, body) {
            var message = {
                from: {
                    id: this._user.id,
                    uuid: this._user.uuid,
                    email : this._user.email
                },
                uuid: to.uuid,
                message: body
            };
            this._firebaseRef.child('users/' + to.id + '/messages').push(message);
        },
        reply: function(message, body) {
            this.send(message.from, body);
        },
        handleMessageAdded: function(s) {
            this.trigger('message_added', this._createMessage(s));
        },
        handleMessageRemoved: function(s) {
            this.trigger('message_removed', s.val());
        },
        _createMessage: function(s){
            var m = s.val();
            m.remove = function(){
                s.ref().remove();
            }
            return m;
        }
    });
    _(MessageService.prototype)
    window.MessageService = MessageService;
}).call(this);
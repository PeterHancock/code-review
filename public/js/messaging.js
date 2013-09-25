(function(){
    var MessageService = function(firebaseRef, user) {
        this._firebaseRef = firebaseRef;
        this._user = user;
    };
    _(MessageService.prototype).extend({
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
        }

    });
    window.MessageService = MessageService;
}).call(this);
(function(){
    var FirebaseService = function(app) {
        _(this).extend(new Firebase(app + '.firebaseio.com'));
    };
    _(FirebaseService.prototype).extend({
        getUserRef: function(user) {
            return this.child('users/' + this.getId(user));
        },
        getId: function(user) {
            return user.id + ':' + user.provider;
        }
    });
    this.FirebaseService = FirebaseService;
}).call(this);
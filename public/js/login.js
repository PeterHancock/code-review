(function(){
    var AuthService = function(id, firebaseRef) {
        if (! (this instanceof AuthService)) {
            return new AuthService(id, firebaseRef);
        }
        this._id = id;
        this._firebaseRef = firebaseRef;
    };
    
    _(AuthService.prototype).extend(Backbone.Events);

    AuthService.prototype.authenticate = function() {
        var scope = this;
        this._auth = new FirebaseSimpleLogin(this._firebaseRef, function(error, user) {
            if(error) {
                return scope.trigger('auth-error', error);
            } else if (user) {
                return scope.trigger('auth-user', user);
            } else {
                return scope.trigger('auth-anon');
            }
        });
    };

    AuthService.prototype.logout = function() {
        this._auth.logout();
    };
    
    AuthService.prototype.login = function() {
        var scope = this;
        var loginDialog = $('#' + this._id);
        loginDialog.hide().load('html/login.html', function(){
            $('#' + scope._id).show();
            $('#github').click(function(e){
                    e.preventDefault(); 
                    loginDialog.hide();
                    scope._auth.login('github', {rememberMe:true});
                    
                });
            $('#password').click(function(e){
                e.preventDefault();
                loginDialog.hide();
                scope._auth.login('password', {email:'peter.hancock@gmail.com', password: 'password'});
            });
        });
    }
     window.AuthService = AuthService;
}).call(this);
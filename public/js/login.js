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
                if (scope._created) {
                    var created = scope._created;
                    scope._created = undefined;
                    return scope.trigger('auth-user-created', user, created);
                }
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
        var loginDialog = $('#' + this._id).empty();
        loginDialog.hide().load('html/login/login.html #login-modal', function(){
            var modal = scope._modal = $('#' + scope._id + ' .login');
            modal.modal('show');
            $('#github').click(function(e){
                e.preventDefault();
                modal.modal('hide');
                scope._auth.login('github', {rememberMe:true});
            });
            loginDialog.find('.sign-in').click(function(e){
                e.preventDefault();
                modal.modal('hide');
                scope._auth.login('password', {email: $('#inputEmail1').val(), password: $('#inputPassword1').val()});
            });
            loginDialog.find('.register').click(function(e){
                e.preventDefault();
                scope._register();
            });
            loginDialog.show();
        });
    }

    AuthService.prototype._register = function(){
        var scope = this;
        var registerDialog = $('#' + this._id).find('.modal-dialog');
        registerDialog.empty().hide().load('html/login/login.html #register-dialog', function(){
            registerDialog.find('.create-user').click(function(e){
                e.preventDefault();
                scope._create($('#inputEmail1').val(), $('#inputPassword1').val(),
                        $('#inputPassword2').val(), $('#inputName1').val());
            })
            registerDialog.show();
        });
   }

    AuthService.prototype._create = function(email, password, passwordRepeat, name){
        var scope = this;
        this._created = {name: name};
        if (password !== passwordRepeat) {
            return scope._modal.find('.messages').append('<div class="alert alert-danger">Passwords differ!</div>');
        }
        this._auth.createUser(email, password, function(error, user) {
            if(error) {
                scope.trigger('user-creation-error', error);
                scope._modal.find('.messages').append('<div class="alert alert-danger">User creation error: ' + error + '</div>');
            } else {
                scope._modal.modal('hide');
                scope._created = {name: name};
                scope._auth.login('password', {email: email, password: password});
            }
        });
    };
     window.AuthService = AuthService;
}).call(this);

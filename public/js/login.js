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
        loginDialog.hide().load('html/login/login.html', function(){
            var modal = scope._modal = $('#' + scope._id + ' .login');
            modal.modal('show');
            $('#github').click(function(e){
                e.preventDefault(); 
                modal.modal('hide');
                scope._auth.login('github', {rememberMe:true});
            });
            $('#password').click(function(e){
                e.preventDefault();
                modal.modal('hide');
                scope._auth.login('password', {email:'peter.hancock@gmail.com', password: 'password'});
            });
            loginDialog.find('.sign-in').click(function(e){
                e.preventDefault();
                modal.modal('hide');
                scope._auth.login('password', {email: $('#inputEmail1').val(), password: $('#inputPassword1').val()});
            });
            loginDialog.find('.create-user').click(function(e){
                e.preventDefault();
                scope._create($('#inputEmail1').val(), $('#inputPassword1').val(), $('#inputName1').val());
            });
            loginDialog.show();
        });
    }
    
    AuthService.prototype._create = function(email, password, name){
        var scope = this;
        this._created = {name: name};
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
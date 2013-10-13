Code Reviewer Assignment
====

Manage your peer review process by assigning reviewers based upon historic assignments, with a touch of randomness.

Live demo
----
Start using straight away [here](http://peterhancock.github.io/code-review/? "Title").

Steps for self hosting
----

* Fork the project and [clone](https://help.github.com/articles/fork-a-repo)
* Create a [Firebase](https://www.firebase.com/) app
* Setup the security rules
 * Locate your [Firebase](https://www.firebase.com/) Secret
 * Use the [Firebase Rest API](https://www.firebase.com/docs/rest-api.html) to update the security rules with those in __security-rules.json__
* [Checkout](https://help.github.com/articles/fork-a-repo) the __gh-pages__ branch
* Edit/create the config.json file so that 'firebaseUrl' is set to application name created in the previous step, e.g. for the App __https://my-company-code-review.firebaseio.com/__ firebaseUrl is set to __my-company-code-review__
* Add the domain serving your app (e.g. __github.com__) to the list of allowed authenticated request in [Firebase](https://www.firebase.com/)
* To activate single sign-on login with Github follow the instructions at [Firebase Authentication](https://www.firebase.com/docs/security/authentication.html)
* Push changes and the navigate to your [Github Pages](http://pages.github.com/) app in a browser.

Using Github Pages for hosting is merely a suggestion - to host this static web app elsewhere just follow the above steps, serving the contents of the gh-pages branch
 and ensure Firebase is correctly configured to allow authenticated requests from your Apps domain.
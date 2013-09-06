var _ = require('underscore')

var history = [
    [1,2,3,4,5],
    [1,3,2,5,4]
];


function shuffle(reviewers, history) {
    console.log( _.shuffle(reviewers))
    var allCosts = calcAllCosts(reviewers, history)
    var items = _.chain(reviewers).shuffle().map(function(reviewer) {return [reviewer]}).value();
    console.log(items); 
    console.log(allCosts); 
}


function calcAllCosts(reviewers, history) {
    return _(reviewers).reduce(function(memo, reviewer) {
        var reviewerHistory = _(calcReviewerHistory(reviewer, history)).intersection(reviewers)
        memo[reviewer] = calcReviewCost(reviewer, reviewerHistory)
        return memo
    }, {})
}

function calcReviewerHistory(reviewer, history) {
    return _(history).reduce(function(memo, sprint) {
        var i = _(sprint).indexOf(reviewer)
        if(i != -1) {
            if(i == sprint.length - 1) {
                memo.push(sprint[0])
            } else {
                memo.push(sprint[i + 1])
            }
        }
        return memo;
        }, [] );
}

function calcReviewCost(reviewer, reviewerHistory) {
    var n = 0;
    return _(reviewerHistory).reduce(function(memo, reviewee) {
        n++;
        memo[reviewee] = (memo[reviewee] || 0) + 1/n;
        return memo
    }, {});

} 

shuffle([1,2,3,4,5], history)

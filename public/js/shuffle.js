(function() {
    if ((typeof global !== "undefined" && global !== null) && (typeof require !== "undefined" && require !== null) && (typeof module !== "undefined" && module !== null)) {
        exports = global;
        exports._ = require('underscore');
    }

    function shuffle(reviewers, history) {
        var reviewersHistory = _(history).map(function(sprint) {
            return _(sprint).intersection(reviewers);
        })
        console.log('hisory',reviewersHistory);
        var allCosts = calcAllCosts(reviewers, reviewersHistory)
        console.log(allCosts);
        var items = _.chain(reviewers).shuffle().map(function(reviewer) {return [reviewer]}).value();
        return shuffleItems(items, allCosts);
    }
    
    function shuffleItems(items, allCosts) {
        while(items.length > 1) {
            items = _(items).shuffle();
            var head = _(items).first();
            var tail = _(items).rest();
            var best = _(tail).min(function(candidate) {
                return allCosts[_(head).last()][_(candidate).first()] || 0;
            })
            head.push.apply(head, best)
            items = _(items).reject(function(item) {
                    return _(item).first() == _(best).first();})
        }
        return _(items).flatten();
    }
    
    function calcAllCosts(reviewers, history) {
        return _(reviewers).reduce(function(memo, reviewer) {
            var reviewerHistory = calcReviewerHistory(reviewer, history);
            memo[reviewer] = calcReviewCost(reviewer, reviewerHistory);
            return memo;
        }, {})
    }
    
    function calcReviewerHistory(reviewer, history) {
        return _(history).reduce(function(memo, sprint) {
            var i = _(sprint).indexOf(reviewer)
            if(i != -1) {
                if(i == sprint.length - 1) {
                    memo.push(sprint[0]);
                } else {
                    memo.push(sprint[i + 1]);
                }
            }
            return memo;
            }, [] );
    }
    
    function calcReviewCost(reviewer, reviewerHistory) {
        var weight = 1;
        return _(reviewerHistory).reduce(function(memo, reviewee) {
            memo[reviewee] = (memo[reviewee] || 0) + weight;
            weight = weight / 2;
            return memo;
        }, {});
    } 

    if ((typeof module !== "undefined" && module !== null ? module.exports : void 0) != null) {
        module.exports = shuffle;
    } else if (typeof window !== "undefined" && window !== null) {
        window.shuffle = shuffle;
    } else {
        throw new Error('This library only supports node.js and modern browsers.');
    }
}).call(this);


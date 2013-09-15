(function() {
    if ((typeof global !== "undefined" && global !== null) && (typeof require !== "undefined" && require !== null) && (typeof module !== "undefined" && module !== null)) {
        exports = global;
        exports._ = require('underscore');
    }

    function shuffle(reviewers, history, constraints) {
        //Validate params
        if (constraints) {
            console.assert(_.keys(constraints).length == _.chain(constraints).invert().keys().value().length);
            _(constraints).each(function(reviewee, reviewer) {
                console.assert(_(reviewers).contains(reviewee));
                console.assert(_(reviewers).contains(reviewer));
            });
        }     
        var items = applyConstraints(reviewers, constraints);
        var allCosts = calcAllCosts(reviewers, history);
        var shuffled = [shuffleItems(items.runs, allCosts)];
        shuffled.push.apply(shuffled, items.loops);
        return shuffled;
    }

    function applyConstraints(reviewers, constraints) {
        var loops = [];
        var runs = [];
        var constrained = [];
        constraints = constraints || {};
        function buildRun(reviewer, run) {
            run = run || [reviewer];
            if(_(constrained).contains(reviewer)) {
                return;
            }
            constrained.push(reviewer);
            var reviewee = constraints[reviewer];
            if(reviewee) {
                delete constraints[reviewer];
                if(run[0] == reviewee) {
                    loops.push(run);
                } else {
                    run.push(reviewee);
                    buildRun(reviewee, run);
                }
            } else {
                runs.push(run);
            }
        };
        _.chain(constraints).keys().each(function(reviewer) {
            buildRun(reviewer);
        });
        _.chain(reviewers).difference(constrained).each(function(free) {
            runs.push([free]);
        });
        return {loops: loops, runs: runs};
    }

    function shuffleItems(items, allCosts) {
        while (items.length > 1) {
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
        return items.length > 0 ? reduceClosureCost(_(items).head(), allCosts) : items;
    }
   
    function reduceClosureCost(items, allCosts) {
        var initial = _(items).initial();
        var last = _(initial).last();
        var cost = (allCosts[_(initial).last()][last] || 0) + (allCosts[last][_(initial).head()] || 0);
        var improvement = _.chain(initial).rest().reduce(function(memo, next, i) {
            var cost = (allCosts[memo.prev][last] || 0) + (allCosts[last][next] || 0);
            memo.prev = next;
            if(cost < memo.cost) {
                memo.cost = cost;
                memo.i = i + 1;
            }
            return memo;
        }, {cost: cost, i: 0, prev: _(initial).head()});
        var i = improvement.i;
        if (i > 0) {
            items = initial;
            items.splice(i, i, last);
        }
        return items;
    }

    function calcAllCosts(reviewers, history) {
        return _(reviewers).reduce(function(memo, reviewer) {
            var reviewerHistory = calcReviewerHistory(reviewer, reviewers, history);
            memo[reviewer] = calcReviewCost(reviewer, reviewerHistory);
            return memo;
        }, {})
    }
   
    function calcReviewerHistory(reviewer, reviewers, history) {
        return _(history).reduce(function(memo, sprint) {
            var group = _(sprint).find(function(group) {
                    return _(group).contains(reviewer);
            });
            if (group == undefined) {
                return memo;
            }
            var i = _(group).indexOf(reviewer)
            if(i != -1) {
                var reviewee = (i == group.length - 1) ? group[0] : group[i + 1];
                if(_(reviewers).contains(reviewee)) {
                    memo.push(reviewee);
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


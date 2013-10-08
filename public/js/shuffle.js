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
        var items = applyConstraints(reviewers, _(constraints).clone());
        var allCosts = calcAllCosts(reviewers, history);
        var shuffled = [shuffleItems(items.runs, allCosts)];
        shuffled.push.apply(shuffled, items.loops);
        return shuffled;
    }

    function applyConstraints(reviewers, constraints) {
        var loops = [];
        var runs = {};
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
                } else if(runs[reviewee]) {
                    run = run.concat(runs[reviewee]);
                    delete runs[reviewee];
                    runs[run[0]] = run;
                    buildRun(reviewee, run);
                } else {
                    run.push(reviewee);
                    buildRun(reviewee, run);
                }
            } else {
                runs[run[0]] = run;
            }
        };
        _.chain(constraints).keys().each(function(reviewer) {
            buildRun(reviewer);
        });
        runs = _(runs).values();
        _.chain(reviewers).difference(constrained).each(function(free) {
            runs.push([free]);
        });
        return {loops: loops, runs: runs};
    }

    function shuffleItems(items, allCosts) {
        while (items.length > 5) {
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
        return shuffle5Items(items, allCosts);
    }

    function shuffle5Items(items, allCosts) {
        if (items.length < 3) {
            return _(items).flatten();
        }
        var first = _(items).first();
        var rest = _(items).rest();
        var restCombos = combinations(rest);
        var minCost = costOf(items, allCosts);
        var bestOrder = [];
        _(restCombos).each(function(combo){
            var order = [first].concat(combo);
            var cost = costOf(order, allCosts);
            if (cost < minCost) {
                minCost = cost;
                bestOrder = [order];
            } else if(cost == minCost) {
                bestOrder.push(order);
            }
        });
        return _(bestOrder[_.random(bestOrder.length - 1)]).flatten(true);
    }

    function combinations(list) {
        var combos = []
        if (list.length == 1) {
            combos.push(list);
        } else if (list.length > 1) {
           var len = list.length;
           while(len > 0) {
               var first = _(list).first();
               var rest = _(list).rest();
               var restCombos = combinations(rest);
               _(restCombos).each(function(r) {
                   combos.push([first].concat(r));
               });
               rest.push(first);
               list = rest;
               len--;
           }
        }
        return combos;
    }

    function costOf(items, allCosts) {
        if (items.length < 2) {
            return 0;
        }
        var first = _(items).first();
        var rest = _(items).rest();
        return _(rest).reduce(function(memo, next){
            memo.cost = memo.cost + (allCosts[_(memo.prev).last()][_(next).first()] || 0);
            memo.prev = next;
            return memo;
        }, {cost: allCosts[_.chain(rest).last().last().value()][_(first).head()] || 0, prev: first}).cost;
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
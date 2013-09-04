history = [
[1,2,3,4,5]]
def shuffle(items) {
    def histo = items.inject([:]) { memo, i ->
        def hist = individualHistory(i)
        hist.retainAll(items)
        memo[i] = hist
        memo
    }
    def costs = items.inject([:]) { memo, i ->
        memo[i] = cost(histo[i])
        memo
    }
    def shuffle = items.collect{[it]}
    def random = new Random()
    while(shuffle.size() > 1) {
        Collections.shuffle(shuffle)
        def head = shuffle.head()
        def tail = shuffle.tail()
        def best = tail.min { j ->
            costs[head.last()][j.head()]  
        }
        head.addAll best
        shuffle.removeAll{ it == best}
    }
    shuffle = shuffle.head()
}

def individualHistory(i) {
    history.inject([]){memo, order ->
        if (!order.contains(i)) {
            return memo
        }
        def n = order.indexOf(i) + 1
        memo << order[n == order.size() ? 0 : n]
        memo
    }
}

def cost(hist) {
    def t = 0
    hist.inject([:].withDefault{k -> 0}) {memo, j ->
        t++
        memo[j] = memo[j] + 1 / t
        memo
    }
}


(1..6).each {
    history = [shuffle([1,2,3,4,5])] + history
}
history.each {
    println it
}


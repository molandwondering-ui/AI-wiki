public class SentinelListDemo {
    private static class Node {
        int value;
        Node next;
        Node(int value, Node next) { this.value = value; this.next = next; }
    }

    private final Node sentinel = new Node(0, null); // 0 只是占位值，不是列表元素。
    private int size;

    void addFirst(int value) {
        sentinel.next = new Node(value, sentinel.next);
        size++;
    }

    void addLast(int value) {
        Node p = sentinel; // 空表也能从这里开始。
        while (p.next != null) {
            p = p.next;
        }
        p.next = new Node(value, null); // 改尾节点的连接，才真正接上了新节点。
        size++;
    }

    String values() {
        StringBuilder out = new StringBuilder("[");
        for (Node p = sentinel.next; p != null; p = p.next) {
            if (p != sentinel.next) { out.append(", "); }
            out.append(p.value);
        }
        return out.append("]").toString();
    }

    public static void main(String[] args) {
        SentinelListDemo list = new SentinelListDemo();
        System.out.println(list.values() + "，size=" + list.size);
        list.addLast(20);
        list.addFirst(10);
        System.out.println(list.values() + "，size=" + list.size);
    }
}

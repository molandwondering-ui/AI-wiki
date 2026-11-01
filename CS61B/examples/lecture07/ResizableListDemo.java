import java.util.Arrays;

public class ResizableListDemo {
    private int[] items = new int[2];
    private int size;

    void addLast(int value) {
        if (size == items.length) {
            items = Arrays.copyOf(items, Math.max(1, items.length * 2));
            System.out.println("扩容到：" + items.length);
        }
        items[size] = value;
        size++;
    }

    int get(int index) {
        // 有这个数组格子，不代表它属于列表的有效内容。
        if (index < 0 || index >= size) {
            throw new IndexOutOfBoundsException("下标 " + index + "，size=" + size);
        }
        return items[index];
    }

    int removeLast() {
        if (size == 0) { throw new IllegalStateException("空列表不能删除"); }
        size--;
        return items[size]; // int 旧值留在有效范围以外，之后添加会覆盖。
    }

    public static void main(String[] args) {
        ResizableListDemo list = new ResizableListDemo();
        for (int value : new int[] {10, 20, 30}) {
            list.addLast(value);
            System.out.println("size=" + list.size + "，容量=" + list.items.length);
        }
        System.out.println("第二个数：" + list.get(1));
        System.out.println("删除末尾：" + list.removeLast());
        try {
            list.get(2);
        } catch (IndexOutOfBoundsException error) {
            System.out.println("读取被拒绝：" + error.getMessage());
        }
        list.removeLast();
        list.removeLast();
        try {
            list.removeLast();
        } catch (IllegalStateException error) {
            System.out.println(error.getMessage());
        }
    }
}

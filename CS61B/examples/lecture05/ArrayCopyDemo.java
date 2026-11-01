import java.util.Arrays;

public class ArrayCopyDemo {
    static class Box {
        int value;
        Box(int value) { this.value = value; }
    }

    public static void main(String[] args) {
        Box[] original = {new Box(1)};
        Box[] copy = new Box[1];
        System.arraycopy(original, 0, copy, 0, 1);
        // 数组是两份，但第一格都指向同一个 Box。
        copy[0].value = 9;
        System.out.println("修改盒子：" + original[0].value + " / " + copy[0].value);
        copy[0] = new Box(7); // 只替换 copy 中的引用。
        System.out.println("换个盒子：" + original[0].value + " / " + copy[0].value);

        int[][] rows = new int[2][]; // 只创建外层，暂时还没有各行。
        System.out.println("第一行还没创建：" + (rows[0] == null));
        rows[0] = new int[] {1};
        rows[1] = new int[] {2, 3};
        System.out.println("不等长的两行：" + Arrays.deepToString(rows));
    }
}

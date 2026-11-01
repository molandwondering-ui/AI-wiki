import java.util.Arrays;

public class ReferenceDemo {
    static void change(int[] numbers) {
        numbers[0] = 9; // 改的是双方都能找到的那个数组。
        numbers = new int[] {7, 8}; // 现在只让参数指向新数组。
        System.out.println("方法里面：" + Arrays.toString(numbers));
    }

    public static void main(String[] args) {
        int[] a = {1, 2};
        int[] b = a; // 复制引用，没有创建第二个数组。
        change(b);
        System.out.println("a：" + Arrays.toString(a));
        System.out.println("b：" + Arrays.toString(b));
        System.out.println("同一个数组：" + (a == b));
    }
}

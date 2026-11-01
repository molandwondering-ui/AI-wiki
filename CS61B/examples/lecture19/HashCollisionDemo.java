import java.util.HashMap;
import java.util.Map;

public class HashCollisionDemo {
    public static void main(String[] args) {
        String first = "Aa";
        String second = "BB";
        System.out.println("两个哈希值：" + first.hashCode() + " / " + second.hashCode());
        System.out.println("键是否相等：" + first.equals(second));
        Map<String, String> orders = new HashMap<>();
        orders.put(first, "奶茶");
        orders.put(second, "咖啡");
        System.out.println("分别查询：" + orders.get("Aa") + " / " + orders.get("BB"));
        orders.put(new String("Aa"), "少糖奶茶"); // 对象不同，但字符串内容相等。
        System.out.println("更新后：" + orders.get("Aa") + "，size=" + orders.size());
        System.out.println("缺失的键：" + orders.get("CC"));

        // 下面只演示教学哈希表的下标计算，不是复刻 HashMap 的内部算法。
        System.out.println("负数取余：" + (-1 % 4));
        System.out.println("合法桶下标：" + Math.floorMod(-1, 4));
        System.out.println("最小整数的绝对值：" + Math.abs(Integer.MIN_VALUE));
    }
}

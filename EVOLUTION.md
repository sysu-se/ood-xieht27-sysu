# EVOLUTION.md - Homework 2 设计演进文档

## 1. 如何实现提示功能？

提示功能分为两个层次：

### 候选提示（getCandidates）
- **实现位置**：`Sudoku.getCandidates(row, col)`
- **算法**：对指定格子，计算候选数 = {1-9} 减去 {同行已填}、{同列已填}、{同宫已填}
- **接口**：`Game.getCandidates(row, col)` 委托给 `Sudoku`

```javascript
getCandidates(row, col) {
  const used = new Set()
  // 收集同行、同列、同宫已填数字
  // 返回不在used中的数字
}
```

### 下一步提示（getNextMove）
- **实现位置**：`Sudoku.getNextMove()`
- **算法**：遍历所有空格，找到候选数只有1个的格子（推定数）
- **接口**：`Game.getNextMove()` 在非探索模式下委托给 `Sudoku`

---

## 2. 提示功能更属于 Sudoku 还是 Game？为什么？

**提示功能更属于 Sudoku**，理由如下：

1. **业务逻辑内聚**：`getCandidates` 和 `getNextMove` 的核心是数独规则（行/列/宫约束），这是 Sudoku 的不变式，与具体游戏会话无关。

2. **职责边界清晰**：Sudoku 负责"知道"数独怎么玩，Game 负责"管理"游戏流程。提示是棋盘自身能够回答的问题。

3. **复用性**：如果未来需要在其他上下文中使用 Sudoku（如求解器、生成器），提示功能同样适用。

4. **避免职责膨胀**：如果把提示放入 Game，会使 Game 承担过多领域逻辑，违反单一职责原则。

**Game 的角色**：作为委托层，在非探索模式下将提示请求转发给 Sudoku。探索模式下 `getNextMove()` 返回 null，表示此时不提供提示（用户需要自行探索）。

---

## 3. 如何实现探索模式？

探索模式的实现采用**快照与回滚**机制：

### 核心数据结构
```javascript
class Game {
  _exploring: boolean       // 是否处于探索模式
  _exploreSnapshot: {      // 探索快照
    sudoku: Sudoku,         // sudoku副本
    history: Move[],        // 探索前的主history
    future: Move[]          // 探索前的future
  }
  _exploreHistory: Move[]   // 探索过程中的临时历史
}
```

### 关键操作

**进入探索（explore）**
- 克隆当前 Sudoku 作为快照
- 保存当前 history 和 future 栈
- 清空探索历史

**提交探索（commitExplore）**
- 将探索历史合并到主历史
- 清除 future 栈（因为探索后不能重做）
- 退出探索模式

**放弃探索（rollbackExplore）**
- 恢复快照中的 sudoku
- 恢复快照中的 history 和 future
- 清空探索相关状态

### 设计选择理由

| 方案 | 优点 | 缺点 |
|------|------|------|
| 快照与回滚 | 实现简单，状态清晰 | 每次探索需要clone |
| 独立子会话 | 隔离性好 | 实现复杂，需要合并逻辑 |
| 状态切换 | 简单 | 容易混淆主状态和探索状态 |

选择快照与回滚是因为它能够在简单实现和功能完整性之间取得平衡，且不会引入复杂的分支合并语义。

---

## 4. 主局面与探索局面的关系是什么？

### 关系模型

探索开始时，对主局面进行**深拷贝**作为探索起点。探索过程中：
- 主局面保持不变
- 探索局面是主局面的独立副本
- 探索历史记录在独立的栈中

### 共享 vs 复制

**采用复制方案**：
- 探索开始时 clone 当前 sudoku
- 探索过程中的所有操作都作用于副本
- 提交时将探索历史合并到主历史
- 放弃时丢弃副本，恢复主局面

### 深拷贝问题

clone() 方法使用 `new Sudoku(this._grid)` 实现深拷贝：
```javascript
clone() {
  return new Sudoku(this._grid)  // Sudoku构造函数会深拷贝grid
}
```

Sudoku 构造函数确保每个格都是独立拷贝，避免了共享嵌套数组的问题。

### 提交 vs 放弃

**提交时**：
- 探索历史中的每条记录被追加到主 history
- 新的主状态由探索结果直接决定

**放弃时**：
- 主局面完全恢复到探索前的状态
- 探索历史被丢弃

---

## 5. history 结构在本次作业中是否发生了变化？

### 变化说明

**线性栈结构保持不变**，但新增了探索历史栈：

```
主 history (线性栈)
├── Move { row, col, value, prevValue }
├── Move { row, col, value, prevValue }
└── ...

主 future (线性栈)
├── Move { ... }
└── ...

探索历史 (线性栈，仅探索模式期间使用)
├── Move { ... }
├── Move { ... }
└── ...
```

### 设计决策

- **未采用树状分支**：根据作业要求，不强制要求多层嵌套探索和 DAG 合并
- **探索历史独立管理**：避免探索操作污染主 history
- **提交时扁平化**：将探索历史扁平合并到主 history，保持线性结构

### 可扩展性

如果将来需要支持多层嵌套探索，当前结构可以扩展为：
- 维护一个"探索栈"
- 每层探索有独立的快照和探索历史
- 提交/放弃操作影响栈顶探索层

---

## 6. Homework 1 中的哪些设计，在 Homework 2 中暴露出了局限？

### 局限 1：Sudoku 缺少题面约束

**问题**：Homework 1 的 `Sudoku` 只有 `_grid`，没有区分固定格（givens）和可编辑格。这导致：
- 无法防止用户修改题目给出的数字
- 候选数计算不准确（会把 givens 当作普通已填数字）

**解决**：在 Sudoku 中添加 `_givens` 数组，标记哪些格子是题目给出的。

### 局限 2：Game 暴露了可变 Sudoku

**问题**：`Game.getSudoku()` 直接返回 `this._sudoku` 引用，调用方可以直接修改棋盘，绕过 Game 的历史记录。

**解决**：在 Homework 2 中，`Sudoku.guess()` 会检查固定格约束，防止非法修改。同时，Game 通过委托模式提供操作接口，而不是暴露底层对象。

### 局限 3：Sudoku 承担了会话级职责

**问题**：Homework 1 中 `Sudoku.undo()` 依赖 Game 的历史记录格式，混入了会话级协议。

**解决**：在 Homework 2 中，`Sudoku` 保持纯粹的领域职责（棋盘状态管理），`Game` 负责历史管理和操作协调。`Sudoku.undo()` 只接受 `{row, col, prevValue}` 并恢复值，不理解"撤销栈"的语义。

### 局限 4：缺乏冲突检测

**问题**：Homework 1 的 Sudoku 没有冲突检测接口，无法在填入时或填入后判断局面是否合法。

**解决**：添加 `hasConflict()` 和 `hasConflicts()` 方法，支持冲突检测。

### 局限 5：构造与反序列化缺少不变式校验

**问题**：构造函数和 `fromJSON()` 直接信任输入，任何畸形数据都能恢复出一个表面可用但语义错误的对象。

**解决**：
- 添加 `validateGrid()` 函数验证输入是否为有效的 9x9 矩阵
- `Sudoku.fromJSON()` 和 `Game.fromJSON()` 添加 null 检查和缺失字段检查

### 局限 6：无效操作也产生历史记录

**问题**：`Game.guess()` 先记录历史再执行填入，如果 Sudoku 静默拒绝无效操作，会产生无意义的历史项。

**解决**：在 `Game.guess()` 中，先比较 `prevValue === move.value`，只有真的发生变更时才记录历史。`guess()` 方法返回 `boolean` 表示是否真的发生了变更。

---

## 7. 如果重做一次 Homework 1，你会如何修改原设计？

### 首要修改：添加 givens 约束

```javascript
class Sudoku {
  constructor(puzzle) {
    validateGrid(puzzle) // 添加输入校验
    this._grid = puzzle.map(row => [...row])
    // 新增：标记固定格
    this._givens = puzzle.map(row => row.map(cell => cell !== 0))
  }

  isGiven(row, col) {
    return this._givens[row][col]
  }

  guess(move) {
    // 新增：固定格检查
    if (this._givens[move.row][move.col]) {
      throw new Error('Cannot modify given cell')
    }
    // ...
  }
}
```

### 首要修改：封装 Sudoku 引用

```javascript
class Game {
  constructor(sudoku) {
    this._sudoku = sudoku
    // 移除 getSudoku 对可变引用的暴露
    // 或者返回只读视图
  }

  getSudoku() {
    // 返回深拷贝，防止外部绕过历史
    return this._sudoku.clone()
  }
}
```

### 架构建议

1. **Sudoku 作为纯领域对象**：只关心棋盘状态、数独规则、候选数计算
2. **Game 作为会话管理器**：负责历史、操作入口、探索模式
3. **接口分离**：将"执行操作"和"查询状态"分开
4. **不变式验证**：在构造和反序列化时校验输入有效性
5. **幂等性检查**：在记录历史前检查操作是否真的改变了状态

### 保持的优点

1. **轻量 delta 历史记录**：`{row, col, value, prevValue}` 比整盘快照更高效
2. **防御性拷贝**：构造函数和 `getGrid()` 都进行深拷贝
3. **序列化支持**：`toJSON()` / `fromJSON()` 保持对称

---

## 总结

本次 Homework 2 在 Homework 1 的基础上：

1. **扩展了 Sudoku 的业务内涵**：从"可回滚的 9x9 数组"进化为真正的数独领域对象
2. **引入了探索模式**：通过快照与回滚机制，在不破坏主history的前提下支持试错
3. **保持了设计原则**：单一职责、领域封装、接口清晰
4. **强化了不变式校验**：构造和反序列化时进行输入验证
5. **优化了历史记录**：只有真的发生变更时才记录，避免无意义历史

核心演进思路：**领域对象应该是完整的业务实体，而不是数据容器**。

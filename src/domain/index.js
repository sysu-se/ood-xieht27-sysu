/**
 * Sudoku 领域对象 - 表示数独局面
 * 核心职责：持有题面(givens)和当前局面，提供候选数计算和冲突检测
 */
/**
 * 验证网格是否为有效的 9x9 数独矩阵
 * @param {number[][]} grid
 * @throws {Error} 如果格式无效
 */
function validateGrid(grid) {
  if (!Array.isArray(grid) || grid.length !== 9) {
    throw new Error('Grid must be a 9x9 array')
  }
  for (let i = 0; i < 9; i++) {
    if (!Array.isArray(grid[i]) || grid[i].length !== 9) {
      throw new Error('Grid must be a 9x9 array')
    }
    for (let j = 0; j < 9; j++) {
      const val = grid[i][j]
      if (typeof val !== 'number' || val < 0 || val > 9 || !Number.isInteger(val)) {
        throw new Error('Grid cells must be integers between 0 and 9')
      }
    }
  }
}

class Sudoku {
  /**
   * @param {number[][]} puzzle - 9x9 数独题目（0表示空格）
   */
  constructor(puzzle) {
    // 验证输入有效性
    validateGrid(puzzle)
    // 深拷贝确保不可变
    this._grid = puzzle.map(row => [...row])
    // 标记题面中的固定格(givens)
    this._givens = puzzle.map(row => row.map(cell => cell !== 0))
  }

  /**
   * 获取当前网格副本
   * @returns {number[][]} 9x9 网格
   */
  getGrid() {
    return this._grid.map(row => [...row])
  }

  /**
   * 判断指定位置是否是题目给出的固定格
   * @param {number} row
   * @param {number} col
   * @returns {boolean}
   */
  isGiven(row, col) {
    return this._givens[row][col]
  }

  /**
   * 计算指定格子的候选数集合
   * 候选数 = {1-9} - {同行已填} - {同列已填} - {同宫已填}
   * @param {number} row
   * @param {number} col
   * @returns {number[]} 候选数数组，按升序排列
   */
  getCandidates(row, col) {
    // 固定格没有候选数
    if (this._givens[row][col]) {
      return []
    }
    // 已有值的格子候选数为空
    if (this._grid[row][col] !== 0) {
      return []
    }

    const used = new Set()

    // 收集同行已填数字
    for (let c = 0; c < 9; c++) {
      const val = this._grid[row][c]
      if (val !== 0) used.add(val)
    }

    // 收集同列已填数字
    for (let r = 0; r < 9; r++) {
      const val = this._grid[r][col]
      if (val !== 0) used.add(val)
    }

    // 收集同宫已填数字
    const boxRow = Math.floor(row / 3) * 3
    const boxCol = Math.floor(col / 3) * 3
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        const val = this._grid[r][c]
        if (val !== 0) used.add(val)
      }
    }

    // 返回不在used中的数字
    const candidates = []
    for (let v = 1; v <= 9; v++) {
      if (!used.has(v)) {
        candidates.push(v)
      }
    }
    return candidates
  }

  /**
   * 获取下一个可推断的格子（唯一候选数）
   * @returns {{row: number, col: number, value: number} | null}
   */
  getNextMove() {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const candidates = this.getCandidates(row, col)
        if (candidates.length === 1) {
          return { row, col, value: candidates[0] }
        }
      }
    }
    return null
  }

  /**
   * 检查填入指定值是否产生冲突
   * @param {number} row
   * @param {number} col
   * @param {number} value
   * @returns {boolean} true表示有冲突
   */
  hasConflict(row, col, value) {
    // 固定格不能修改
    if (this._givens[row][col]) {
      return true
    }

    // 检查同行是否有重复
    for (let c = 0; c < 9; c++) {
      if (c !== col && this._grid[row][c] === value) {
        return true
      }
    }

    // 检查同列是否有重复
    for (let r = 0; r < 9; r++) {
      if (r !== row && this._grid[r][col] === value) {
        return true
      }
    }

    // 检查同宫是否有重复
    const boxRow = Math.floor(row / 3) * 3
    const boxCol = Math.floor(col / 3) * 3
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (r !== row && c !== col && this._grid[r][c] === value) {
          return true
        }
      }
    }

    return false
  }

  /**
   * 检查当前局面是否已完成（无空格且无冲突）
   * @returns {boolean}
   */
  isComplete() {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (this._grid[row][col] === 0) return false
      }
    }
    return !this.hasConflicts()
  }

  /**
   * 检查当前局面是否有任何冲突
   * @returns {boolean}
   */
  hasConflicts() {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const val = this._grid[row][col]
        if (val !== 0) {
          // 临时清除该格，检查是否有冲突
          const original = this._grid[row][col]
          this._grid[row][col] = 0
          const conflict = this._checkConflictRaw(row, col, val)
          this._grid[row][col] = original
          if (conflict) return true
        }
      }
    }
    return false
  }

  /**
   * 内部方法：检查在指定位置填入值是否产生冲突（不检查是否固定）
   * @private
   */
  _checkConflictRaw(row, col, value) {
    // 检查同行
    for (let c = 0; c < 9; c++) {
      if (c !== col && this._grid[row][c] === value) return true
    }
    // 检查同列
    for (let r = 0; r < 9; r++) {
      if (r !== row && this._grid[r][col] === value) return true
    }
    // 检查同宫
    const boxRow = Math.floor(row / 3) * 3
    const boxCol = Math.floor(col / 3) * 3
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (r !== row && c !== col && this._grid[r][c] === value) return true
      }
    }
    return false
  }

  /**
   * 填入一个值（不做冲突检查）
   * @param {{row: number, col: number, value: number}} move
   */
  guess(move) {
    const { row, col, value } = move
    if (row < 0 || row > 8 || col < 0 || col > 8) {
      throw new Error('Invalid position')
    }
    if (value < 0 || value > 9) {
      throw new Error('Invalid value')
    }
    // 不能修改固定格
    if (this._givens[row][col]) {
      throw new Error('Cannot modify given cell')
    }
    this._grid[row][col] = value
  }

  /**
   * 撤销一次填入
   * @param {{row: number, col: number, prevValue: number}} move
   */
  undo(move) {
    const { row, col, prevValue } = move
    this._grid[row][col] = prevValue
  }

  /**
   * 深拷贝
   * @returns {Sudoku}
   */
  clone() {
    return new Sudoku(this._grid)
  }

  /**
   * 序列化为 JSON
   * @returns {object}
   */
  toJSON() {
    return {
      grid: this.getGrid()
    }
  }

  /**
   * 外表化表示（调试用）
   * @returns {string}
   */
  toString() {
    const lines = []
    for (let i = 0; i < 9; i++) {
      let line = ''
      for (let j = 0; j < 9; j++) {
        const cell = this._grid[i][j]
        if (this._givens[i][j]) {
          line += cell.toString()
        } else {
          line += cell === 0 ? '.' : cell.toString()
        }
        if (j === 2 || j === 5) line += '|'
        line += ' '
      }
      lines.push(line.trim())
      if (i === 2 || i === 5) lines.push('-------+-------+-------')
    }
    return lines.join('\n')
  }

  /**
   * 从 JSON 创建
   * @param {object} json
   * @returns {Sudoku}
   */
  static fromJSON(json) {
    if (!json || !json.grid) {
      throw new Error('Invalid JSON: missing grid')
    }
    return new Sudoku(json.grid)
  }
}

/**
 * Game 领域对象 - 表示一局游戏
 * 核心职责：管理游戏会话、history、提示和探索模式
 */
class Game {
  /**
   * @param {Sudoku} sudoku
   */
  constructor(sudoku) {
    this._sudoku = sudoku
    // 历史栈：存储 Move 记录
    this._history = []
    // 未来栈：存储可重做的操作
    this._future = []
    // 探索模式状态
    this._exploring = false
    // 探索快照：探索开始时的主局面状态
    this._exploreSnapshot = null
    // 探索过程中的临时历史
    this._exploreHistory = []
  }

  /**
   * 获取当前 Sudoku
   * @returns {Sudoku}
   */
  getSudoku() {
    return this._sudoku
  }

  /**
   * 是否处于探索模式
   * @returns {boolean}
   */
  isExploring() {
    return this._exploring
  }

  /**
   * 获取指定格子的候选数（委托给 Sudoku）
   * @param {number} row
   * @param {number} col
   * @returns {number[]}
   */
  getCandidates(row, col) {
    return this._sudoku.getCandidates(row, col)
  }

  /**
   * 获取下一步提示（唯一候选数）
   * @returns {{row: number, col: number, value: number} | null}
   */
  getNextMove() {
    // 探索模式下不提供下一步提示（需要用户自行探索）
    if (this._exploring) {
      return null
    }
    return this._sudoku.getNextMove()
  }

  /**
   * 进入探索模式
   * 创建当前局面的快照，允许用户尝试不同的候选值
   */
  explore() {
    if (this._exploring) {
      return // 已经在探索模式
    }
    this._exploring = true
    // 保存快照：sudoku副本 + 当前history + 当前future
    this._exploreSnapshot = {
      sudoku: this._sudoku.clone(),
      history: [...this._history],
      future: [...this._future]
    }
    // 清空探索历史
    this._exploreHistory = []
  }

  /**
   * 提交探索结果
   * 将探索过程中的操作合并到主历史，清除未来的重做栈
   */
  commitExplore() {
    if (!this._exploring) {
      return
    }
    // 将探索历史合并到主历史
    this._history.push(...this._exploreHistory)
    // 提交后清除未来重做栈
    this._future = []
    this._exploring = false
    this._exploreSnapshot = null
    this._exploreHistory = []
  }

  /**
   * 放弃探索，回滚到探索开始前的状态
   */
  rollbackExplore() {
    if (!this._exploring || !this._exploreSnapshot) {
      return
    }
    // 恢复快照
    this._sudoku = this._exploreSnapshot.sudoku
    this._history = this._exploreSnapshot.history
    this._future = this._exploreSnapshot.future
    this._exploring = false
    this._exploreSnapshot = null
    this._exploreHistory = []
  }

  /**
   * 检查探索过程中是否产生冲突
   * @returns {boolean}
   */
  hasExploreConflict() {
    if (!this._exploring) {
      return false
    }
    return this._sudoku.hasConflicts()
  }

  /**
   * 填入一个值（带历史记录）
   * @param {{row: number, col: number, value: number}} move
   * @returns {boolean} 是否真的发生了变更
   */
  guess(move) {
    // 记录当前位置的原值，用于撤销
    const prevValue = this._sudoku.getGrid()[move.row][move.col]

    // 如果值没有变化，不记录历史
    if (prevValue === move.value) {
      return false
    }

    // 执行填入（Sudoku.guess会检查是否固定格）
    this._sudoku.guess(move)

    const moveRecord = {
      row: move.row,
      col: move.col,
      value: move.value,
      prevValue
    }

    if (this._exploring) {
      // 探索模式下，记录到探索历史
      this._exploreHistory.push(moveRecord)
    } else {
      // 正常模式下，记录到主历史
      this._history.push(moveRecord)
      // 新的操作会清除未来的历史
      this._future = []
    }
    return true
  }

  /**
   * 撤销上一步
   */
  undo() {
    // 探索模式下撤销探索历史
    if (this._exploring) {
      return this._undoExplore()
    }

    if (!this.canUndo()) {
      return
    }

    // 弹出最后一步
    const move = this._history.pop()

    // 恢复原值
    this._sudoku.undo({
      row: move.row,
      col: move.col,
      prevValue: move.prevValue
    })

    // 放入未来栈
    this._future.push(move)
  }

  /**
   * 探索模式下的撤销
   * @private
   */
  _undoExplore() {
    if (this._exploreHistory.length === 0) {
      return
    }
    const move = this._exploreHistory.pop()
    this._sudoku.undo({
      row: move.row,
      col: move.col,
      prevValue: move.prevValue
    })
  }

  /**
   * 重做上一步
   */
  redo() {
    // 探索模式下不支持重做
    if (this._exploring) {
      return
    }

    if (!this.canRedo()) {
      return
    }

    // 弹出未来栈的最后一步
    const move = this._future.pop()

    // 重新执行
    this._sudoku.guess({
      row: move.row,
      col: move.col,
      value: move.value
    })

    // 放回历史栈
    this._history.push(move)
  }

  /**
   * @returns {boolean}
   */
  canUndo() {
    if (this._exploring) {
      return this._exploreHistory.length > 0
    }
    return this._history.length > 0
  }

  /**
   * @returns {boolean}
   */
  canRedo() {
    // 探索模式下不支持重做
    if (this._exploring) {
      return false
    }
    return this._future.length > 0
  }

  /**
   * 序列化为 JSON
   * @returns {object}
   */
  toJSON() {
    return {
      sudoku: this._sudoku.toJSON(),
      history: this._history.map(m => ({ ...m })),
      future: this._future.map(m => ({ ...m }))
    }
  }

  /**
   * 从 JSON 创建
   * @param {object} json
   * @returns {Game}
   */
  static fromJSON(json) {
    if (!json || !json.sudoku) {
      throw new Error('Invalid JSON: missing sudoku')
    }
    const sudoku = Sudoku.fromJSON(json.sudoku)
    const game = new Game(sudoku)
    game._history = (json.history || []).map(m => ({ ...m }))
    game._future = (json.future || []).map(m => ({ ...m }))
    return game
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建 Sudoku 对象
 * @param {number[][]} input - 9x9 grid
 * @returns {Sudoku}
 */
export function createSudoku(input) {
  return new Sudoku(input)
}

/**
 * 从 JSON 创建 Sudoku
 * @param {object} json
 * @returns {Sudoku}
 */
export function createSudokuFromJSON(json) {
  return Sudoku.fromJSON(json)
}

/**
 * 创建 Game 对象
 * @param {{sudoku: Sudoku}} param
 * @returns {Game}
 */
export function createGame({ sudoku }) {
  return new Game(sudoku)
}

/**
 * 从 JSON 创建 Game
 * @param {object} json
 * @returns {Game}
 */
export function createGameFromJSON(json) {
  return Game.fromJSON(json)
}

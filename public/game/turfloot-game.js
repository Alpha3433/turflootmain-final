/**
 * TurfLoot - Interactive Paper-io Style Game
 * Built with Phaser 3 for skill-based territory capture
 */

class TurfLootGame {
  constructor() {
    this.config = {
      type: Phaser.AUTO,
      width: 800,
      height: 800,
      parent: 'turfloot-canvas',
      backgroundColor: '#000000',
      scene: {
        preload: this.preload.bind(this),
        create: this.create.bind(this),
        update: this.update.bind(this)
      }
    }
    
    this.gridSize = 20
    this.cols = this.config.width / this.gridSize
    this.rows = this.config.height / this.gridSize
    this.grid = []
    this.player = null
    this.playerTrail = []
    this.territory = []
    this.gameActive = true
    this.territoryPercent = 0
    this.lastMoveTime = 0
    this.moveDelay = 100 // milliseconds between moves
    
    this.game = new Phaser.Game(this.config)
  }
  
  preload() {
    // Create colored graphics for game elements
    this.add.graphics()
      .fillStyle(0x14F195) // TurfLoot green
      .fillRect(0, 0, this.gridSize, this.gridSize)
      .generateTexture('player', this.gridSize, this.gridSize)
    
    this.add.graphics()
      .fillStyle(0x14F195, 0.6) // Semi-transparent trail
      .fillRect(0, 0, this.gridSize, this.gridSize)
      .generateTexture('trail', this.gridSize, this.gridSize)
    
    this.add.graphics()
      .fillStyle(0x14F195, 0.8) // Solid territory
      .fillRect(0, 0, this.gridSize, this.gridSize)
      .generateTexture('territory', this.gridSize, this.gridSize)
      
    this.add.graphics()
      .fillStyle(0xFF4444) // Enemy/danger color
      .fillRect(0, 0, this.gridSize, this.gridSize)
      .generateTexture('enemy', this.gridSize, this.gridSize)
  }
  
  create() {
    // Initialize grid
    for (let x = 0; x < this.cols; x++) {
      this.grid[x] = []
      for (let y = 0; y < this.rows; y++) {
        this.grid[x][y] = 0 // 0 = empty, 1 = territory, 2 = trail, 3 = enemy
      }
    }
    
    // Create player at center
    const startX = Math.floor(this.cols / 2)
    const startY = Math.floor(this.rows / 2)
    
    this.player = {
      x: startX,
      y: startY,
      sprite: this.add.sprite(
        startX * this.gridSize + this.gridSize/2, 
        startY * this.gridSize + this.gridSize/2, 
        'player'
      ),
      direction: null
    }
    
    // Create initial territory (3x3 around player)
    for (let x = startX - 1; x <= startX + 1; x++) {
      for (let y = startY - 1; y <= startY + 1; y++) {
        if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
          this.grid[x][y] = 1
          const territorySprite = this.add.sprite(
            x * this.gridSize + this.gridSize/2, 
            y * this.gridSize + this.gridSize/2, 
            'territory'
          )
          this.territory.push({
            sprite: territorySprite,
            x: x,
            y: y
          })
        }
      }
    }
    
    // Setup controls
    this.setupControls()
    
    // Add some random obstacles/enemies
    this.addRandomObstacles()
    
    // Calculate initial territory
    this.updateTerritoryStats()
    
    // Add UI text
    this.addGameUI()
  }
  
  setupControls() {
    // WASD keys
    this.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S)
    this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.qKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q)
    
    // Arrow keys as backup
    this.cursors = this.input.keyboard.createCursorKeys()
    
    // Cash out on Q
    this.qKey.on('down', () => {
      if (this.gameActive && this.territoryPercent > 0) {
        this.cashOut()
      }
    })
  }
  
  addRandomObstacles() {
    // Add some enemy territories to make game challenging
    const obstacleCount = 5
    for (let i = 0; i < obstacleCount; i++) {
      const x = Phaser.Math.Between(5, this.cols - 5)
      const y = Phaser.Math.Between(5, this.rows - 5)
      
      // Don't place on player's starting area
      if (Math.abs(x - this.player.x) > 3 || Math.abs(y - this.player.y) > 3) {
        this.grid[x][y] = 3
        this.add.sprite(
          x * this.gridSize + this.gridSize/2,
          y * this.gridSize + this.gridSize/2,
          'enemy'
        )
      }
    }
  }
  
  addGameUI() {
    // Add instructions
    this.add.text(10, 10, 'WASD: Move | Q: Cash Out', {
      fontSize: '16px',
      fill: '#14F195',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 }
    })
    
    // Territory percentage display
    this.territoryText = this.add.text(10, 40, 'Territory: 0%', {
      fontSize: '16px',
      fill: '#FFD54F',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 }
    })
    
    // Value display
    this.valueText = this.add.text(10, 70, 'Value: $0.00', {
      fontSize: '16px',
      fill: '#FFD54F',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 }
    })
  }
  
  update(time) {
    if (!this.gameActive) return
    
    // Handle movement with delay to prevent too fast movement
    if (time - this.lastMoveTime > this.moveDelay) {
      this.handleMovement()
      this.lastMoveTime = time
    }
  }
  
  handleMovement() {
    let newX = this.player.x
    let newY = this.player.y
    let moved = false
    
    // Check WASD keys
    if (this.wKey.isDown || this.cursors.up.isDown) {
      newY = this.player.y - 1
      moved = true
    } else if (this.sKey.isDown || this.cursors.down.isDown) {
      newY = this.player.y + 1
      moved = true
    } else if (this.aKey.isDown || this.cursors.left.isDown) {
      newX = this.player.x - 1
      moved = true
    } else if (this.dKey.isDown || this.cursors.right.isDown) {
      newX = this.player.x + 1
      moved = true
    }
    
    if (moved && this.isValidMove(newX, newY)) {
      this.movePlayer(newX, newY)
    }
  }
  
  isValidMove(x, y) {
    // Check bounds
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
      return false
    }
    
    // Check for obstacles/enemies
    if (this.grid[x][y] === 3) {
      return false
    }
    
    // Check if moving into own trail (game over condition)
    if (this.grid[x][y] === 2) {
      this.gameOver('Hit your own trail!')
      return false
    }
    
    return true
  }
  
  movePlayer(newX, newY) {
    const oldX = this.player.x
    const oldY = this.player.y
    
    this.player.x = newX
    this.player.y = newY
    
    // Update player sprite position
    this.player.sprite.setPosition(
      newX * this.gridSize + this.gridSize/2,
      newY * this.gridSize + this.gridSize/2
    )
    
    // If we're moving out of our territory, create a trail
    if (this.grid[newX][newY] !== 1) {
      this.grid[newX][newY] = 2
      const trailSprite = this.add.sprite(
        newX * this.gridSize + this.gridSize/2,
        newY * this.gridSize + this.gridSize/2,
        'trail'
      )
      this.playerTrail.push({
        sprite: trailSprite,
        x: newX,
        y: newY
      })
    } else if (this.playerTrail.length > 0) {
      // We've returned to our territory - convert trail to territory
      this.convertTrailToTerritory()
    }
    
    this.updateTerritoryStats()
  }
  
  convertTrailToTerritory() {
    // Convert all trail pieces to territory
    this.playerTrail.forEach(trailPoint => {
      this.grid[trailPoint.x][trailPoint.y] = 1
      trailPoint.sprite.setTexture('territory')
      this.territory.push(trailPoint)
    })
    
    // Flood fill enclosed areas
    this.floodFillEnclosedAreas()
    
    // Clear trail array
    this.playerTrail = []
  }
  
  floodFillEnclosedAreas() {
    // Simple flood fill algorithm to capture enclosed areas
    const visited = Array(this.cols).fill().map(() => Array(this.rows).fill(false))
    
    // Find empty cells and check if they're enclosed
    for (let x = 1; x < this.cols - 1; x++) {
      for (let y = 1; y < this.rows - 1; y++) {
        if (this.grid[x][y] === 0 && !visited[x][y]) {
          const enclosedCells = []
          if (this.isEnclosed(x, y, visited, enclosedCells)) {
            // Convert enclosed cells to territory
            enclosedCells.forEach(cell => {
              this.grid[cell.x][cell.y] = 1
              const territorySprite = this.add.sprite(
                cell.x * this.gridSize + this.gridSize/2,
                cell.y * this.gridSize + this.gridSize/2,
                'territory'
              )
              this.territory.push({
                sprite: territorySprite,
                x: cell.x,
                y: cell.y
              })
            })
          }
        }
      }
    }
  }
  
  isEnclosed(startX, startY, visited, enclosedCells) {
    // Breadth-first search to check if area is enclosed
    const queue = [{x: startX, y: startY}]
    const tempVisited = Array(this.cols).fill().map(() => Array(this.rows).fill(false))
    const cells = []
    let touchesBoundary = false
    
    while (queue.length > 0) {
      const {x, y} = queue.shift()
      
      if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
        touchesBoundary = true
        continue
      }
      
      if (tempVisited[x][y] || this.grid[x][y] !== 0) {
        continue
      }
      
      tempVisited[x][y] = true
      visited[x][y] = true
      cells.push({x, y})
      
      // Add neighboring cells
      queue.push({x: x + 1, y: y})
      queue.push({x: x - 1, y: y})
      queue.push({x: x, y: y + 1})
      queue.push({x: x, y: y - 1})
    }
    
    if (!touchesBoundary && cells.length > 0) {
      enclosedCells.push(...cells)
      return true
    }
    
    return false
  }
  
  updateTerritoryStats() {
    const totalCells = this.cols * this.rows
    const territoryCount = this.territory.length
    
    this.territoryPercent = (territoryCount / totalCells) * 100
    const usdValue = this.territoryPercent * 0.2 // $0.20 per percent for $1 game
    
    // Update UI
    if (this.territoryText) {
      this.territoryText.setText(`Territory: ${this.territoryPercent.toFixed(1)}%`)
    }
    if (this.valueText) {
      this.valueText.setText(`Value: $${usdValue.toFixed(2)}`)
    }
    
    // Send update to parent window
    if (window.parent) {
      window.parent.postMessage({
        type: 'update',
        territoryPercent: this.territoryPercent,
        usdValue: usdValue
      }, '*')
    }
  }
  
  cashOut() {
    this.gameActive = false
    
    // Visual feedback
    this.add.text(this.config.width / 2, this.config.height / 2, 'CASHING OUT!', {
      fontSize: '32px',
      fill: '#FFD54F',
      backgroundColor: '#000000',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5)
    
    // Send cash out message to parent
    if (window.parent) {
      window.parent.postMessage({
        type: 'cashout',
        territoryPercent: this.territoryPercent,
        usdValue: this.territoryPercent * 0.2
      }, '*')
    }
    
    // Restart game after 3 seconds
    setTimeout(() => {
      this.restartGame()
    }, 3000)
  }
  
  gameOver(reason) {
    this.gameActive = false
    
    this.add.text(this.config.width / 2, this.config.height / 2, `GAME OVER\n${reason}`, {
      fontSize: '24px',
      fill: '#FF4444',
      backgroundColor: '#000000',
      padding: { x: 16, y: 8 },
      align: 'center'
    }).setOrigin(0.5)
    
    // Restart game after 3 seconds
    setTimeout(() => {
      this.restartGame()
    }, 3000)
  }
  
  restartGame() {
    // Clear all sprites and restart
    this.game.scene.scenes[0].scene.restart()
  }
  
  destroy() {
    if (this.game) {
      this.game.destroy(true)
    }
  }
}

// Make it globally available
window.TurfLootGame = TurfLootGame
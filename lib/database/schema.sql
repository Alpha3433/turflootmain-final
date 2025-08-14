-- TurfLoot Lobby System Database Schema
-- Run this to set up the lobby tables

-- Lobbies table
CREATE TABLE IF NOT EXISTS lobbies (
    id VARCHAR(36) PRIMARY KEY DEFAULT (LOWER(HEX(RANDOMBLOB(16)))),
    host_user_id VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('PUBLIC', 'PRIVATE') DEFAULT 'PUBLIC',
    region VARCHAR(10) DEFAULT 'na',
    join_code VARCHAR(6) NULL,
    status ENUM('OPEN', 'IN_MATCH', 'CLOSED') DEFAULT 'OPEN',
    max_players INT DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_host_user (host_user_id),
    INDEX idx_region_status (region, status),
    INDEX idx_join_code (join_code)
);

-- Lobby members table
CREATE TABLE IF NOT EXISTS lobby_members (
    id VARCHAR(36) PRIMARY KEY DEFAULT (LOWER(HEX(RANDOMBLOB(16)))),
    lobby_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    role ENUM('HOST', 'MEMBER') DEFAULT 'MEMBER',
    ready BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lobby_id) REFERENCES lobbies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_lobby_user (lobby_id, user_id),
    INDEX idx_user_lobby (user_id, lobby_id)
);

-- Matches table  
CREATE TABLE IF NOT EXISTS matches (
    id VARCHAR(36) PRIMARY KEY DEFAULT (LOWER(HEX(RANDOMBLOB(16)))),
    lobby_id VARCHAR(36) NOT NULL,
    region VARCHAR(10) NOT NULL,
    server_endpoint TEXT NOT NULL,
    status ENUM('PENDING', 'LIVE', 'ENDED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    FOREIGN KEY (lobby_id) REFERENCES lobbies(id) ON DELETE CASCADE,
    INDEX idx_lobby_match (lobby_id),
    INDEX idx_status (status)
);

-- Game rooms for match allocation
CREATE TABLE IF NOT EXISTS game_rooms (
    id VARCHAR(36) PRIMARY KEY DEFAULT (LOWER(HEX(RANDOMBLOB(16)))),
    match_id VARCHAR(36) NOT NULL,
    room_code VARCHAR(20) NOT NULL,
    server_url VARCHAR(255) NOT NULL,
    capacity INT DEFAULT 2,
    current_players INT DEFAULT 0,
    status ENUM('WAITING', 'ACTIVE', 'FINISHED') DEFAULT 'WAITING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    UNIQUE KEY unique_room_code (room_code)
);
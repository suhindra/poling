package db

import (
	"fmt"
	"log"
	"os"
	"poling-api/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() (*gorm.DB, error) {
	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "poling.db"
	}

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// AutoMigrate tables
	if err := db.AutoMigrate(
		&models.Admin{},
		&models.Voter{},
		&models.Candidate{},
		&models.VotingPeriod{},
		&models.Vote{},
	); err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	DB = db

	// Seed initial data if needed
	seedInitialData(db)

	log.Println("Database initialized successfully")
	return db, nil
}

func seedInitialData(db *gorm.DB) {
	// Check if admin already exists
	var adminCount int64
	db.Model(&models.Admin{}).Count(&adminCount)
	if adminCount == 0 {
		// Create default admin (username: admin, password: admin123)
		// In production, use proper password hashing
		admin := models.Admin{
			Username: "admin",
			Password: "admin123", // TODO: Hash this password
			Email:    "admin@poling.local",
		}
		if err := db.Create(&admin).Error; err != nil {
			log.Printf("Failed to create default admin: %v\n", err)
		}
	}

	// Create voting periods if they don't exist
	positions := []string{"ketua", "sekretaris", "bendahara", "pengawas"}
	for _, position := range positions {
		var period models.VotingPeriod
		result := db.Where("position = ?", position).Limit(1).Find(&period)
		if result.RowsAffected == 0 {
			newPeriod := models.VotingPeriod{
				Position: position,
				IsOpen:   false,
			}
			if err := db.Create(&newPeriod).Error; err != nil {
				log.Printf("Failed to create voting period for %s: %v\n", position, err)
			}
		}
	}
}

func GetDB() *gorm.DB {
	return DB
}

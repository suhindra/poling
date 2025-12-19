package main

import (
	"fmt"
	"log"
	"os"
	"poling-api/internal/db"
	"poling-api/internal/handlers"
	"poling-api/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	godotenv.Load()

	// Initialize database
	database, err := db.InitDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize handlers
	h := handlers.NewHandlers(database)

	// Setup Gin router
	router := gin.Default()

	// Middleware
	router.Use(middleware.CORSMiddleware())

	// Serve static files (uploads)
	router.Static("/uploads", "./uploads")

	// Public routes
	router.POST("/api/login", h.Login)
	router.POST("/api/admin-login", h.AdminLogin)
	router.POST("/api/register-participant", h.RegisterParticipant)

	// Protected voter routes
	voterGroup := router.Group("/api/voter")
	voterGroup.Use(middleware.AuthMiddleware("voter"))
	{
		voterGroup.GET("/current-period", h.GetCurrentPeriod)
		voterGroup.GET("/candidates", h.GetCandidatesForPeriod)
		voterGroup.POST("/vote", h.SubmitVote)
		voterGroup.GET("/voting-status", h.GetVotingStatus)
		voterGroup.GET("/selected-candidates-other-positions", h.GetSelectedCandidatesInOtherPositions)
	}

	// Protected admin routes
	adminGroup := router.Group("/api/admin")
	adminGroup.Use(middleware.AuthMiddleware("admin"))
	{
		adminGroup.GET("/dashboard", h.GetDashboard)
		adminGroup.POST("/period/open", h.OpenVotingPeriod)
		adminGroup.POST("/period/close", h.CloseVotingPeriod)
		adminGroup.GET("/results", h.GetResults)
		adminGroup.POST("/generate-credentials", h.GenerateCredentials)
		adminGroup.GET("/voters", h.GetVoters)
		adminGroup.GET("/voters/export", h.ExportVotersCSV)
		adminGroup.POST("/voters/reset", h.ResetVoters)
		adminGroup.POST("/candidates", h.CreateCandidate)
		adminGroup.GET("/candidates", h.ListAllCandidates)
		adminGroup.PUT("/candidates/:id", h.UpdateCandidate)
		adminGroup.DELETE("/candidates/:id", h.DeleteCandidate)
		adminGroup.POST("/reset-voting", h.ResetVoting)
		adminGroup.POST("/generate-dummy-votes", h.GenerateDummyVotes)
		adminGroup.GET("/participants", h.GetParticipants)
		adminGroup.GET("/participants/export", h.ExportParticipantsCSV)
		adminGroup.DELETE("/participants/:id", h.DeleteParticipant)
	}

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	router.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Server running on port %s\n", port)
	router.Run(":" + port)
}

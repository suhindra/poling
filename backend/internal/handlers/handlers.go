package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"poling-api/internal/models"
	"poling-api/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

type Handlers struct {
	db *gorm.DB
}

func NewHandlers(db *gorm.DB) *Handlers {
	return &Handlers{db: db}
}

// Login handles voter login
func (h *Handlers) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var voter models.Voter
	if err := h.db.Where("username = ?", req.Username).First(&voter).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	// TODO: Use bcrypt for password hashing in production
	if voter.Password != req.Password {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	// Generate JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":   voter.ID,
		"type": "voter",
		"exp":  time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user": gin.H{
			"id":       voter.ID,
			"username": voter.Username,
		},
	})
}

// AdminLogin handles admin login
func (h *Handlers) AdminLogin(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var admin models.Admin
	if err := h.db.Where("username = ?", req.Username).First(&admin).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	// TODO: Use bcrypt for password hashing in production
	if admin.Password != req.Password {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	// Generate JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":   admin.ID,
		"type": "admin",
		"exp":  time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user": gin.H{
			"id":       admin.ID,
			"username": admin.Username,
		},
	})
}

// GetCurrentPeriod returns the currently open voting period
func (h *Handlers) GetCurrentPeriod(c *gin.Context) {
	var period models.VotingPeriod
	// Use Find instead of First to avoid error logs when no period open
	result := h.db.Where("is_open = ?", true).Limit(1).Find(&period)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusOK, nil)
		return
	}

	c.JSON(http.StatusOK, period)
}

// GetCandidatesForPeriod returns candidates for current period
func (h *Handlers) GetCandidatesForPeriod(c *gin.Context) {
	var period models.VotingPeriod
	// Use Find instead of First to avoid error logs
	result := h.db.Where("is_open = ?", true).Limit(1).Find(&period)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no active voting period"})
		return
	}

	var candidates []models.Candidate
	if err := h.db.Where("is_active = ? OR id IN (SELECT DISTINCT candidate_id FROM votes WHERE position = ?)", true, period.Position).Order("number ASC").Find(&candidates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch candidates"})
		return
	}

	// Filter candidates that have this position in their positions list
	var filteredCandidates []models.Candidate
	for _, candidate := range candidates {
		if utils.IsPositionInList(candidate.Positions, period.Position) {
			filteredCandidates = append(filteredCandidates, candidate)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"position":   period.Position,
		"candidates": filteredCandidates,
	})
}

// SubmitVote records a vote
func (h *Handlers) SubmitVote(c *gin.Context) {
	voterID, _ := c.Get("userID")
	voterIDUint := voterID.(uint)

	var req models.VoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get current period
	var period models.VotingPeriod
	result := h.db.Where("is_open = ?", true).Limit(1).Find(&period)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no active voting period"})
		return
	}

	// Check if voter already voted in this period
	var existingVote models.Vote
	if err := h.db.Where("voter_id = ? AND position = ?", voterIDUint, period.Position).First(&existingVote).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "you have already voted in this period"})
		return
	}

	// Check if candidate already won in another position (cannot vote for already-winning candidate)
	var winningPeriod models.VotingPeriod
	if err := h.db.Where("winner = ? AND is_open = false", req.CandidateID).First(&winningPeriod).Error; err == nil {
		// Candidate already won in another position
		c.JSON(http.StatusBadRequest, gin.H{"error": "this candidate has already won in another position"})
		return
	}

	// Create vote
	vote := models.Vote{
		VoterID:     voterIDUint,
		CandidateID: req.CandidateID,
		Position:    period.Position,
	}

	if err := h.db.Create(&vote).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record vote"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "vote recorded successfully"})
}

// GetVotingStatus returns voting status for current voter
func (h *Handlers) GetVotingStatus(c *gin.Context) {
	voterID, _ := c.Get("userID")
	voterIDUint := voterID.(uint)

	positions := []string{"ketua", "sekretaris", "bendahara", "pengawas"}
	var statuses []models.VotingStatus

	for _, pos := range positions {
		var votes []models.Vote
		// Use Find instead of First to avoid "record not found" log messages
		result := h.db.Where("voter_id = ? AND position = ?", voterIDUint, pos).Find(&votes)
		hasVoted := result.RowsAffected > 0

		statuses = append(statuses, models.VotingStatus{
			Position: pos,
			HasVoted: hasVoted,
		})
	}

	c.JSON(http.StatusOK, statuses)
}

// GetDashboard returns admin dashboard data
func (h *Handlers) GetDashboard(c *gin.Context) {
	var totalVoters int64
	h.db.Model(&models.Voter{}).Count(&totalVoters)

	// Get current period
	var currentPeriod models.VotingPeriod
	currentPeriodName := ""
	// Use Limit(1) to be explicit, ignore error if no open period exists
	h.db.Where("is_open = ?", true).Limit(1).Find(&currentPeriod)
	if currentPeriod.ID != 0 {
		currentPeriodName = currentPeriod.Position
	}

	// Count voters who voted in CURRENT period only
	var votersVoted int64
	if currentPeriodName != "" {
		// If there's an active period, count voters for that period
		h.db.Model(&models.Vote{}).Where("position = ?", currentPeriodName).Distinct("voter_id").Count(&votersVoted)
	} else {
		// If no active period, return 0
		votersVoted = 0
	}

	// Get period status
	var allPeriods []models.VotingPeriod
	h.db.Find(&allPeriods)
	periodStatus := make(map[string]bool)
	for _, p := range allPeriods {
		periodStatus[p.Position] = p.IsOpen
	}

	dashboard := models.DashboardData{
		CurrentPeriod: currentPeriodName,
		TotalVoters:   int(totalVoters),
		VotersVoted:   int(votersVoted),
		Results:       make(map[string]interface{}),
		PeriodStatus:  periodStatus,
	}

	c.JSON(http.StatusOK, dashboard)
}

// OpenVotingPeriod opens a voting period
func (h *Handlers) OpenVotingPeriod(c *gin.Context) {
	var req struct {
		Position string `json:"position" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Close all other periods
	h.db.Model(&models.VotingPeriod{}).Where("position != ?", req.Position).Update("is_open", false)

	// Open requested period
	now := time.Now()
	if err := h.db.Model(&models.VotingPeriod{}).Where("position = ?", req.Position).Updates(map[string]interface{}{
		"is_open":   true,
		"opened_at": now,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open period"})
		return
	}

	// Reactivate candidates for this position that had won previously
	h.db.Model(&models.Candidate{}).
		Where("id IN (SELECT winner FROM voting_periods WHERE position = ? AND winner IS NOT NULL)", req.Position).
		Update("is_active", true)

	c.JSON(http.StatusOK, gin.H{"message": "voting period opened"})
}

// CloseVotingPeriod closes a voting period and determines winner
func (h *Handlers) CloseVotingPeriod(c *gin.Context) {
	var req struct {
		Position string `json:"position" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find winner (candidate with most votes)
	var winner struct {
		CandidateID uint
		VoteCount   int
	}

	if err := h.db.Model(&models.Vote{}).
		Where("position = ?", req.Position).
		Select("candidate_id, COUNT(*) as vote_count").
		Group("candidate_id").
		Order("vote_count DESC").
		Limit(1).
		Scan(&winner).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to determine winner"})
		return
	}

	// Close period and set winner
	now := time.Now()
	if err := h.db.Model(&models.VotingPeriod{}).Where("position = ?", req.Position).Updates(map[string]interface{}{
		"is_open":   false,
		"closed_at": now,
		"winner":    winner.CandidateID,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to close period"})
		return
	}

	// Deactivate winning candidate for next periods
	h.db.Model(&models.Candidate{}).Where("id = ?", winner.CandidateID).Update("is_active", false)

	c.JSON(http.StatusOK, gin.H{
		"message": "voting period closed",
		"winner":  winner.CandidateID,
	})
}

// GetResults returns voting results ordered by position (Ketua, Sekretaris, Bendahara, Pengawas)
func (h *Handlers) GetResults(c *gin.Context) {
	type VoteResult struct {
		CandidateID uint   `json:"candidate_id"`
		Name        string `json:"name"`
		Number      int    `json:"number"`
		PhotoPath   string `json:"photo_path"`
		VoteCount   int    `json:"vote_count"`
	}

	type PositionResult struct {
		Position string       `json:"position"`
		Votes    []VoteResult `json:"votes"`
	}

	positions := []string{"ketua", "sekretaris", "bendahara", "pengawas"}
	var results []PositionResult

	for _, pos := range positions {
		var votes []VoteResult

		h.db.Model(&models.Vote{}).
			Joins("JOIN candidates ON votes.candidate_id = candidates.id").
			Where("votes.position = ?", pos).
			Select("votes.candidate_id, candidates.name, candidates.number, candidates.photo_path, COUNT(*) as vote_count").
			Group("votes.candidate_id, candidates.name, candidates.number, candidates.photo_path").
			Order("vote_count DESC").
			Scan(&votes)

		// If votes is nil, initialize as empty slice
		if votes == nil {
			votes = []VoteResult{}
		}
		results = append(results, PositionResult{
			Position: pos,
			Votes:    votes,
		})
	}

	c.JSON(http.StatusOK, results)
}

// GenerateCredentials generates voter credentials
func (h *Handlers) GenerateCredentials(c *gin.Context) {
	var req models.GenerateCredentialsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var credentials []struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	for i := 0; i < req.Count; i++ {
		username := utils.GenerateReadableUsername()
		password := utils.GenerateNumericPassword()

		voter := models.Voter{
			Username: username,
			Password: password, // TODO: Hash password
		}

		if err := h.db.Create(&voter).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate credentials"})
			return
		}

		credentials = append(credentials, struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}{
			Username: username,
			Password: password,
		})
	}

	c.JSON(http.StatusOK, gin.H{"credentials": credentials})
}

// GetVoters returns list of all voters
func (h *Handlers) GetVoters(c *gin.Context) {
	var voters []models.Voter
	if err := h.db.Find(&voters).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch voters"})
		return
	}

	c.JSON(http.StatusOK, voters)
}

// CreateCandidate creates a new candidate
func (h *Handlers) CreateCandidate(c *gin.Context) {
	// Check if this is multipart form data (with file) or JSON
	contentType := c.ContentType()

	var name string
	var number int
	var photoPath string
	var positions []string

	if contentType == "application/json" {
		// Handle JSON request (for backward compatibility)
		var req models.CreateCandidateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		name = req.Name
		number = req.Number
		positions = req.Positions
	} else {
		// Handle multipart form data with file
		if err := c.Request.ParseMultipartForm(10 << 20); err != nil { // 10MB max
			c.JSON(http.StatusBadRequest, gin.H{"error": "failed to parse form"})
			return
		}

		name = c.PostForm("name")
		numberStr := c.PostForm("number")
		if numberStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "number is required"})
			return
		}

		var err error
		number, err = strconv.Atoi(numberStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid number format"})
			return
		}

		// Handle positions from form
		positionsStr := c.PostForm("positions")
		if positionsStr != "" {
			positions = utils.JSONToPositions(positionsStr)
		}

		// Handle file upload
		file, err := c.FormFile("photo")
		if err == nil {
			// File is present, save it
			filename := fmt.Sprintf("candidate_%d_%d.jpg", time.Now().Unix(), number)
			photoPath = "/uploads/" + filename

			// Save file to uploads directory
			uploadsDir := "./uploads"
			if err := os.MkdirAll(uploadsDir, 0755); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create uploads directory"})
				return
			}

			if err := c.SaveUploadedFile(file, uploadsDir+"/"+filename); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
				return
			}
		}
	}

	candidate := models.Candidate{
		Name:      name,
		Number:    number,
		PhotoPath: photoPath,
		Positions: utils.PositionsToJSON(positions),
		IsActive:  true,
	}

	if err := h.db.Create(&candidate).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create candidate"})
		return
	}

	c.JSON(http.StatusOK, candidate)
}

// ListAllCandidates returns all candidates
func (h *Handlers) ListAllCandidates(c *gin.Context) {
	var candidates []models.Candidate
	if err := h.db.Find(&candidates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch candidates"})
		return
	}

	c.JSON(http.StatusOK, candidates)
}

// DeleteCandidate deletes a candidate
func (h *Handlers) DeleteCandidate(c *gin.Context) {
	id := c.Param("id")

	if err := h.db.Delete(&models.Candidate{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete candidate"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "candidate deleted"})
}

// UpdateCandidate updates candidate name, positions, and/or photo
func (h *Handlers) UpdateCandidate(c *gin.Context) {
	id := c.Param("id")

	// Check if this is multipart form data (with file) or JSON
	contentType := c.ContentType()

	var name string
	var positions []string
	var photoPath string
	var photoUpdated bool
	var hasPositions bool

	if contentType == "application/json" {
		// Handle JSON request
		var req struct {
			Name      string   `json:"name"`
			Positions []string `json:"positions"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		name = req.Name
		positions = req.Positions
		hasPositions = true // Explicitly sent in JSON
	} else {
		// Handle multipart form data with file
		if err := c.Request.ParseMultipartForm(10 << 20); err != nil { // 10MB max
			c.JSON(http.StatusBadRequest, gin.H{"error": "failed to parse form"})
			return
		}

		name = c.PostForm("name")

		// Parse positions if provided
		positionsJSON := c.PostForm("positions")
		if positionsJSON != "" {
			if err := json.Unmarshal([]byte(positionsJSON), &positions); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid positions format"})
				return
			}
			hasPositions = true
		}

		// Handle file upload
		file, err := c.FormFile("photo")
		if err == nil {
			// File is present, save it
			photoUpdated = true
			filename := fmt.Sprintf("candidate_%d_%s.jpg", time.Now().Unix(), id)
			photoPath = "/uploads/" + filename

			// Save file to uploads directory
			uploadsDir := "./uploads"
			if err := os.MkdirAll(uploadsDir, 0755); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create uploads directory"})
				return
			}

			if err := c.SaveUploadedFile(file, uploadsDir+"/"+filename); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
				return
			}
		}
	}

	// Build update map
	updateMap := make(map[string]interface{})
	if name != "" {
		updateMap["name"] = name
	}
	if hasPositions && len(positions) > 0 {
		positionsStr := strings.Join(positions, ",")
		updateMap["positions"] = positionsStr
	}
	if photoUpdated {
		updateMap["photo_path"] = photoPath
	}

	if len(updateMap) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fields to update"})
		return
	}

	// Update candidate
	var candidate models.Candidate
	if err := h.db.Model(&candidate).Where("id = ?", id).Updates(updateMap).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update candidate"})
		return
	}

	// Fetch updated candidate
	h.db.First(&candidate, id)
	c.JSON(http.StatusOK, candidate)
}

// ResetVoting deletes all votes and closes all voting periods
func (h *Handlers) ResetVoting(c *gin.Context) {
	// Delete all votes
	if err := h.db.Exec("DELETE FROM votes").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete votes"})
		return
	}

	// Close all voting periods - update all records
	if err := h.db.Model(&models.VotingPeriod{}).Where("id > ?", 0).Update("is_open", false).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to close periods"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "voting reset successfully"})
}

// ResetVoters deletes all voters
func (h *Handlers) ResetVoters(c *gin.Context) {
	if err := h.db.Exec("DELETE FROM voters").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete voters"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "all voters deleted successfully"})
}

// ExportVotersCSV exports voters as CSV file
func (h *Handlers) ExportVotersCSV(c *gin.Context) {
	var voters []models.Voter
	if err := h.db.Find(&voters).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch voters"})
		return
	}

	// Create CSV content
	csv := "No,Username,Password,Email\n"
	for i, voter := range voters {
		csv += fmt.Sprintf("%d,%s,%s,%s\n", i+1, voter.Username, voter.Password, voter.Email)
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", `attachment; filename="voters.csv"`)
	c.String(http.StatusOK, csv)
}

// GenerateDummyVotes generates dummy voting data for demo purposes
func (h *Handlers) GenerateDummyVotes(c *gin.Context) {
	// Get all candidates
	var candidates []models.Candidate
	if err := h.db.Find(&candidates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch candidates"})
		return
	}

	if len(candidates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no candidates found, please add candidates first"})
		return
	}

	// Get all voters
	var voters []models.Voter
	if err := h.db.Find(&voters).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch voters"})
		return
	}

	if len(voters) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no voters found, please generate voters first"})
		return
	}

	// Clear existing votes
	if err := h.db.Exec("DELETE FROM votes").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to clear existing votes"})
		return
	}

	// Dummy voting data distribution
	positions := []string{"ketua", "sekretaris", "bendahara", "pengawas"}
	voteCount := 0

	for _, voter := range voters {
		for _, pos := range positions {
			// Get candidates for this position
			var positionCandidates []models.Candidate
			h.db.Find(&positionCandidates, "positions LIKE ?", "%"+pos+"%")

			if len(positionCandidates) > 0 {
				// Random distribution with weighted preference
				// First candidates get more votes for demo
				candidateIdx := (int(voter.ID) + len(positionCandidates)) % len(positionCandidates)
				candidate := positionCandidates[candidateIdx]

				vote := models.Vote{
					VoterID:     voter.ID,
					CandidateID: candidate.ID,
					Position:    pos,
				}

				if err := h.db.Create(&vote).Error; err != nil {
					// Continue even if one vote fails
					continue
				}
				voteCount++
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "dummy votes generated successfully",
		"vote_count": voteCount,
	})
}

// RegisterParticipant registers a new participant (public endpoint)
func (h *Handlers) RegisterParticipant(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		NIK         string `json:"nik" binding:"required"`
		SatuanKerja string `json:"satuan_kerja" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if NIK already exists
	var existing models.Participant
	if err := h.db.Where("nik = ?", req.NIK).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "NIK already registered"})
		return
	}

	participant := models.Participant{
		Name:        req.Name,
		NIK:         req.NIK,
		SatuanKerja: req.SatuanKerja,
		IsProcessed: false,
	}

	if err := h.db.Create(&participant).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to register participant"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "registration successful",
		"id":      participant.ID,
	})
}

// GetParticipants returns list of registered participants (admin only)
func (h *Handlers) GetParticipants(c *gin.Context) {
	var participants []models.Participant
	if err := h.db.Order("created_at DESC").Find(&participants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch participants"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"participants": participants,
		"total":        len(participants),
	})
}

// ExportParticipantsCSV exports participant list as CSV (admin only)
func (h *Handlers) ExportParticipantsCSV(c *gin.Context) {
	var participants []models.Participant
	if err := h.db.Order("created_at").Find(&participants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export participants"})
		return
	}

	// Generate CSV
	csv := "No,Nama,NIK,Satuan Kerja,Status,Dibuat\n"
	for i, p := range participants {
		status := "Pending"
		if p.IsProcessed {
			status = "Processed"
		}
		csv += fmt.Sprintf("%d,%s,%s,%s,%s,%s\n",
			i+1, p.Name, p.NIK, p.SatuanKerja, status, p.CreatedAt.Format("2006-01-02 15:04:05"))
	}

	c.Header("Content-Disposition", "attachment; filename=participants.csv")
	c.Header("Content-Type", "text/csv")
	c.String(http.StatusOK, csv)
}

// DeleteParticipant deletes a participant (admin only)
func (h *Handlers) DeleteParticipant(c *gin.Context) {
	participantID := c.Param("id")

	if err := h.db.Delete(&models.Participant{}, participantID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete participant"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "participant deleted successfully"})
}

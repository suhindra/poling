package models

import "time"

// Admin represents an admin user
type Admin struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Username  string    `gorm:"unique" json:"username"`
	Password  string    `json:"-"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

// Voter represents a voter
type Voter struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Username  string    `gorm:"unique" json:"username"`
	Password  string    `json:"-"`
	Email     string    `json:"email"`
	HasVoted  bool      `gorm:"default:false" json:"has_voted"`
	CreatedAt time.Time `json:"created_at"`
}

// Candidate represents a candidate
type Candidate struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `json:"name"`
	Number    int       `json:"number"`
	PhotoPath string    `json:"photo_path"` // Path to candidate photo
	Positions string    `json:"positions"`  // JSON: ["ketua","pengawas"] or "ketua,sekretaris"
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

// VotingPeriod represents a voting period for a specific position
type VotingPeriod struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	Position  string     `json:"position"` // "ketua", "sekretaris", "bendahara", "pengawas"
	IsOpen    bool       `gorm:"default:false" json:"is_open"`
	Winner    uint       `json:"winner"` // ID of winning candidate
	OpenedAt  *time.Time `json:"opened_at"`
	ClosedAt  *time.Time `json:"closed_at"`
	CreatedAt time.Time  `json:"created_at"`
}

// Vote represents a vote cast by a voter
type Vote struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	VoterID     uint      `json:"voter_id"`
	CandidateID uint      `json:"candidate_id"`
	Position    string    `json:"position"` // "ketua", "sekretaris", "bendahara", "pengawas"
	CreatedAt   time.Time `json:"created_at"`
	Voter       Voter     `json:"voter"`
	Candidate   Candidate `json:"candidate"`
}

// LoginRequest for voter/admin login
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// VoteRequest for submitting a vote
type VoteRequest struct {
	CandidateID uint `json:"candidate_id" binding:"required"`
}

// VotingStatus represents voting status for a voter
type VotingStatus struct {
	Position string `json:"position"`
	HasVoted bool   `json:"has_voted"`
}

// DashboardData for admin dashboard
type DashboardData struct {
	CurrentPeriod string                 `json:"current_period"`
	TotalVoters   int                    `json:"total_voters"`
	VotersVoted   int                    `json:"voters_voted"`
	Results       map[string]interface{} `json:"results"`
	PeriodStatus  map[string]bool        `json:"period_status"`
}

// CandidateVoteCount for vote results
type CandidateVoteCount struct {
	Candidate Candidate `json:"candidate"`
	VoteCount int       `json:"vote_count"`
}

// GenerateCredentialsRequest for generating voter credentials
type GenerateCredentialsRequest struct {
	Count int `json:"count" binding:"required"`
}

// CredentialsResponse for returning generated credentials
type CredentialsResponse struct {
	Credentials []struct {
		Username string `json:"username"`
		Password string `json:"password"`
	} `json:"credentials"`
}

// CreateCandidateRequest for creating a candidate
type CreateCandidateRequest struct {
	Name      string   `json:"name" binding:"required"`
	Number    int      `json:"number" binding:"required"`
	Positions []string `json:"positions"` // Array of positions: ["ketua", "pengawas"]
}

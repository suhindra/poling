package utils

import (
	"fmt"
	"math/rand"
	"strings"
)

var (
	consonants = []string{"b", "c", "d", "f", "g", "h", "j", "k", "l", "m", "n", "p", "r", "s", "t", "v", "w", "x", "z"}
	vowels     = []string{"a", "e", "i", "o", "u"}
)

// GenerateReadableUsername generates username with pattern: C V C V C (consonant-vowel)
// Example: babid, ketum, musix
func GenerateReadableUsername() string {
	c1 := consonants[rand.Intn(len(consonants))]
	v1 := vowels[rand.Intn(len(vowels))]
	c2 := consonants[rand.Intn(len(consonants))]
	v2 := vowels[rand.Intn(len(vowels))]
	c3 := consonants[rand.Intn(len(consonants))]

	username := strings.ToLower(fmt.Sprintf("%s%s%s%s%s", c1, v1, c2, v2, c3))
	return username
}

// GenerateNumericPassword generates a 6-digit numeric password
func GenerateNumericPassword() string {
	password := fmt.Sprintf("%06d", rand.Intn(1000000))
	return password
}

// PositionsToJSON converts array of positions to JSON string
func PositionsToJSON(positions []string) string {
	if len(positions) == 0 {
		return "[]"
	}
	// Simple format: "ketua,sekretaris" or JSON array format
	return strings.Join(positions, ",")
}

// JSONToPositions converts JSON string back to array of positions
func JSONToPositions(positionsStr string) []string {
	if positionsStr == "" || positionsStr == "[]" {
		return []string{}
	}
	// Split by comma
	positions := strings.Split(positionsStr, ",")
	var cleaned []string
	for _, p := range positions {
		p = strings.TrimSpace(p)
		if p != "" {
			cleaned = append(cleaned, p)
		}
	}
	return cleaned
}

// IsPositionInList checks if a position is in the candidate's positions list
func IsPositionInList(candidatePositions string, position string) bool {
	positions := JSONToPositions(candidatePositions)
	for _, p := range positions {
		if p == position {
			return true
		}
	}
	return false
}

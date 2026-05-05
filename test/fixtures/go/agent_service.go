package service

import (
	"context"
	"errors"
)

const (
	DefaultLimit = 50
	privateLimit = 10
)

var ErrNotFound = errors.New("not found")

type Runner interface {
	Run(ctx context.Context, payload []byte) ([]byte, error)
}

type AgentService struct {
	ID string
	timeoutSeconds int
}

func NewAgentService(id string) *AgentService {
	return &AgentService{ID: id}
}

func (s *AgentService) Run(ctx context.Context, payload []byte) ([]byte, error) {
	return payload, nil
}

func helper() {}

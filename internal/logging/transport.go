package logging

import (
	"bytes"
	"io"
	"net/http"
	"time"

	"drift/internal/models"

	"github.com/google/uuid"
)

// Transport is an http.RoundTripper that logs requests and responses
type Transport struct {
	http.RoundTripper
	LogChan chan models.APILog
}

// RoundTrip implements the http.RoundTripper interface
func (t *Transport) RoundTrip(req *http.Request) (*http.Response, error) {
	reqLog := models.RequestLog{
		ID:        uuid.New().String(),
		Method:    req.Method,
		URL:       req.URL.String(),
		Headers:   make(map[string]string),
		Timestamp: time.Now().Format(time.RFC3339),
		ClientIP:  req.RemoteAddr,
		UserAgent: req.Header.Get("User-Agent"),
	}

	for key, values := range req.Header {
		if len(values) > 0 {
			reqLog.Headers[key] = values[0]
		}
	}

	var reqBody []byte
	if req.Body != nil {
		reqBody, _ = io.ReadAll(req.Body)
		reqLog.Body = string(reqBody)
		req.Body = io.NopCloser(bytes.NewReader(reqBody))
	}

	resp, err := t.RoundTripper.RoundTrip(req)
	if err != nil {
		return nil, err
	}

	respLog := models.ResponseLog{
		ID:         reqLog.ID,
		StatusCode: resp.StatusCode,
		Headers:    make(map[string]string),
		Timestamp:  time.Now().Format(time.RFC3339),
	}

	for key, values := range resp.Header {
		if len(values) > 0 {
			respLog.Headers[key] = values[0]
		}
	}

	var respBody []byte
	if resp.Body != nil {
		respBody, _ = io.ReadAll(resp.Body)
		respLog.Body = string(respBody)
		resp.Body = io.NopCloser(bytes.NewReader(respBody))
	}

	apiLog := models.APILog{Request: reqLog, Response: respLog}
	t.LogChan <- apiLog

	return resp, nil
}

// NewTransport creates a new logging transport
func NewTransport(rt http.RoundTripper, logChan chan models.APILog) *Transport {
	return &Transport{
		RoundTripper: rt,
		LogChan:      logChan,
	}
}

-- Ads Autopilot AI Support System Migration
-- Version: 002 - Support System
-- Description: Tier-based support ticket system with SLA tracking

-- Support Tickets Table
-- Main table for storing all support requests
CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(20) NOT NULL UNIQUE, -- Format: SUP-YYYYMMDD-XXXX
  tenant_id VARCHAR(100) NOT NULL,
  
  -- Ticket Information
  subject VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'technical', 'billing', 'general', 'urgent'
  priority VARCHAR(20) NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'pending_customer', 'resolved', 'closed'
  
  -- Customer Information
  customer_name VARCHAR(255),
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  
  -- Tier Information (copied from subscription at time of creation)
  subscription_tier VARCHAR(50) NOT NULL, -- 'starter', 'professional', 'enterprise'
  support_tier VARCHAR(50) NOT NULL, -- 'email', 'priority_email', 'priority_phone_email'
  
  -- SLA Tracking
  sla_response_hours INTEGER NOT NULL, -- Response time SLA in hours
  sla_resolution_hours INTEGER, -- Resolution time SLA in hours (NULL for no SLA)
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_response_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  
  -- SLA Status
  sla_response_breached BOOLEAN DEFAULT FALSE,
  sla_resolution_breached BOOLEAN DEFAULT FALSE,
  
  -- Internal tracking
  assigned_agent VARCHAR(255),
  internal_notes TEXT,
  escalated BOOLEAN DEFAULT FALSE,
  escalated_at TIMESTAMP WITH TIME ZONE,
  
  -- Foreign key constraint
  FOREIGN KEY (tenant_id) REFERENCES tenant_subscriptions(tenant_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_id ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_tier ON support_tickets(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_sla_breach ON support_tickets(sla_response_breached, sla_resolution_breached);

-- Support Ticket Messages
-- Table for storing all messages/communications for each ticket
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL,
  
  -- Message content
  message_type VARCHAR(20) NOT NULL DEFAULT 'message', -- 'message', 'internal_note', 'status_change'
  sender_type VARCHAR(20) NOT NULL, -- 'customer', 'agent', 'system'
  sender_name VARCHAR(255),
  sender_email VARCHAR(255),
  
  message_content TEXT NOT NULL,
  
  -- Attachments (stored as JSON array of file info)
  attachments JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Internal tracking
  is_public BOOLEAN DEFAULT TRUE, -- FALSE for internal notes
  
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
);

-- Indexes for ticket messages
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_created_at ON support_ticket_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_sender_type ON support_ticket_messages(sender_type);

-- Support SLA Configuration
-- Table for defining SLA rules by tier and category
CREATE TABLE IF NOT EXISTS support_sla_config (
  id SERIAL PRIMARY KEY,
  
  subscription_tier VARCHAR(50) NOT NULL, -- 'starter', 'professional', 'enterprise'
  ticket_category VARCHAR(50) NOT NULL, -- 'technical', 'billing', 'general', 'urgent'
  ticket_priority VARCHAR(20) NOT NULL, -- 'low', 'normal', 'high', 'urgent'
  
  -- SLA times in hours
  response_time_hours INTEGER NOT NULL,
  resolution_time_hours INTEGER, -- NULL means no resolution SLA
  
  -- Support channels available
  support_channels JSONB NOT NULL, -- ['email', 'phone', 'chat']
  
  -- Business hours for SLA calculation
  business_hours_only BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(subscription_tier, ticket_category, ticket_priority)
);

-- Support Contact Methods
-- Table for storing available contact methods per tier
CREATE TABLE IF NOT EXISTS support_contact_methods (
  id SERIAL PRIMARY KEY,
  
  subscription_tier VARCHAR(50) NOT NULL UNIQUE, -- 'starter', 'professional', 'enterprise'
  
  -- Available contact methods
  email_support BOOLEAN DEFAULT TRUE,
  phone_support BOOLEAN DEFAULT FALSE,
  chat_support BOOLEAN DEFAULT FALSE,
  priority_routing BOOLEAN DEFAULT FALSE,
  dedicated_manager BOOLEAN DEFAULT FALSE,
  
  -- Contact information
  support_email VARCHAR(255),
  support_phone VARCHAR(50),
  escalation_email VARCHAR(255),
  
  -- SLA guarantees
  guaranteed_response_hours INTEGER,
  guaranteed_resolution_hours INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Analytics
-- Table for tracking support metrics and performance
CREATE TABLE IF NOT EXISTS support_analytics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  
  -- Aggregated by subscription tier
  subscription_tier VARCHAR(50) NOT NULL,
  
  -- Ticket metrics
  tickets_created INTEGER DEFAULT 0,
  tickets_resolved INTEGER DEFAULT 0,
  tickets_escalated INTEGER DEFAULT 0,
  
  -- Response time metrics
  avg_first_response_minutes INTEGER,
  avg_resolution_hours INTEGER,
  sla_response_compliance_rate DECIMAL(5,2), -- Percentage
  sla_resolution_compliance_rate DECIMAL(5,2), -- Percentage
  
  -- Customer satisfaction
  avg_satisfaction_score DECIMAL(3,2), -- 1.00 to 5.00
  satisfaction_responses INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(date, subscription_tier)
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_support_analytics_date_tier ON support_analytics(date, subscription_tier);

-- Enable Row Level Security for tenant isolation
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support tables
CREATE POLICY support_tickets_policy ON support_tickets
  FOR ALL 
  USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY support_ticket_messages_policy ON support_ticket_messages
  FOR ALL
  USING (
    ticket_id IN (
      SELECT id FROM support_tickets 
      WHERE tenant_id = current_setting('app.current_tenant_id', true)
    )
  );

-- Add updated_at trigger for support tables
CREATE TRIGGER update_support_tickets_updated_at 
  BEFORE UPDATE ON support_tickets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_sla_config_updated_at 
  BEFORE UPDATE ON support_sla_config 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_contact_methods_updated_at 
  BEFORE UPDATE ON support_contact_methods 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default SLA configuration
-- Starter Tier SLAs
INSERT INTO support_sla_config (subscription_tier, ticket_category, ticket_priority, response_time_hours, resolution_time_hours, support_channels) VALUES
('starter', 'general', 'low', 48, NULL, '["email"]'),
('starter', 'general', 'normal', 24, NULL, '["email"]'),
('starter', 'general', 'high', 12, NULL, '["email"]'),
('starter', 'technical', 'low', 48, NULL, '["email"]'),
('starter', 'technical', 'normal', 24, NULL, '["email"]'),
('starter', 'technical', 'high', 12, NULL, '["email"]'),
('starter', 'billing', 'low', 48, NULL, '["email"]'),
('starter', 'billing', 'normal', 24, NULL, '["email"]'),
('starter', 'billing', 'high', 12, NULL, '["email"]');

-- Professional Tier SLAs
INSERT INTO support_sla_config (subscription_tier, ticket_category, ticket_priority, response_time_hours, resolution_time_hours, support_channels) VALUES
('professional', 'general', 'low', 24, 72, '["email"]'),
('professional', 'general', 'normal', 12, 48, '["email"]'),
('professional', 'general', 'high', 6, 24, '["email"]'),
('professional', 'technical', 'low', 24, 72, '["email"]'),
('professional', 'technical', 'normal', 12, 48, '["email"]'),
('professional', 'technical', 'high', 6, 24, '["email"]'),
('professional', 'billing', 'low', 12, 48, '["email"]'),
('professional', 'billing', 'normal', 6, 24, '["email"]'),
('professional', 'billing', 'high', 4, 12, '["email"]'),
('professional', 'urgent', 'urgent', 2, 8, '["email"]');

-- Enterprise Tier SLAs  
INSERT INTO support_sla_config (subscription_tier, ticket_category, ticket_priority, response_time_hours, resolution_time_hours, support_channels) VALUES
('enterprise', 'general', 'low', 12, 48, '["email", "phone"]'),
('enterprise', 'general', 'normal', 6, 24, '["email", "phone"]'),
('enterprise', 'general', 'high', 4, 12, '["email", "phone"]'),
('enterprise', 'technical', 'low', 12, 48, '["email", "phone"]'),
('enterprise', 'technical', 'normal', 6, 24, '["email", "phone"]'),
('enterprise', 'technical', 'high', 4, 12, '["email", "phone"]'),
('enterprise', 'billing', 'low', 6, 24, '["email", "phone"]'),
('enterprise', 'billing', 'normal', 4, 12, '["email", "phone"]'),
('enterprise', 'billing', 'high', 2, 8, '["email", "phone"]'),
('enterprise', 'urgent', 'urgent', 1, 4, '["email", "phone"]');

-- Insert contact methods configuration
INSERT INTO support_contact_methods (subscription_tier, email_support, phone_support, priority_routing, dedicated_manager, support_email, support_phone, guaranteed_response_hours, guaranteed_resolution_hours) VALUES
('starter', TRUE, FALSE, FALSE, FALSE, 'support@adsautopilot.com', NULL, 24, NULL),
('professional', TRUE, FALSE, TRUE, FALSE, 'priority@adsautopilot.com', NULL, 12, 48),
('enterprise', TRUE, TRUE, TRUE, TRUE, 'enterprise@adsautopilot.com', '(307) 395-9830', 6, 24);

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    date_part TEXT;
    sequence_part TEXT;
    next_seq INTEGER;
BEGIN
    -- Get date part (YYYYMMDD format)
    date_part := to_char(NOW(), 'YYYYMMDD');
    
    -- Get next sequence for today
    SELECT COALESCE(MAX(
        CASE 
            WHEN ticket_number ~ ('^SUP-' || date_part || '-[0-9]+$') 
            THEN CAST(substring(ticket_number from '[0-9]+$') AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO next_seq
    FROM support_tickets
    WHERE ticket_number LIKE 'SUP-' || date_part || '-%';
    
    -- Format sequence with leading zeros (4 digits)
    sequence_part := LPAD(next_seq::TEXT, 4, '0');
    
    RETURN 'SUP-' || date_part || '-' || sequence_part;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate SLA hours based on business hours
CREATE OR REPLACE FUNCTION calculate_sla_deadline(
    start_timestamp TIMESTAMP WITH TIME ZONE,
    sla_hours INTEGER,
    business_hours_only BOOLEAN DEFAULT TRUE
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    deadline TIMESTAMP WITH TIME ZONE;
    remaining_hours INTEGER := sla_hours;
    current_time TIMESTAMP WITH TIME ZONE := start_timestamp;
    business_day_start INTEGER := 9; -- 9 AM
    business_day_end INTEGER := 18;   -- 6 PM
    business_hours_per_day INTEGER := business_day_end - business_day_start; -- 9 hours
    current_hour INTEGER;
    current_dow INTEGER; -- Day of week (0=Sunday, 1=Monday, etc.)
BEGIN
    IF NOT business_hours_only THEN
        -- Simple calculation for 24/7 support
        RETURN start_timestamp + (sla_hours || ' hours')::INTERVAL;
    END IF;
    
    -- Calculate deadline considering business hours (Mon-Fri, 9AM-6PM EST)
    WHILE remaining_hours > 0 LOOP
        current_hour := EXTRACT(HOUR FROM current_time);
        current_dow := EXTRACT(DOW FROM current_time);
        
        -- Skip weekends (0=Sunday, 6=Saturday)
        IF current_dow = 0 OR current_dow = 6 THEN
            -- Move to next Monday 9 AM
            current_time := date_trunc('week', current_time) + INTERVAL '1 week' + INTERVAL '1 day' + (business_day_start || ' hours')::INTERVAL;
            CONTINUE;
        END IF;
        
        -- If before business hours, move to business start
        IF current_hour < business_day_start THEN
            current_time := date_trunc('day', current_time) + (business_day_start || ' hours')::INTERVAL;
            current_hour := business_day_start;
        END IF;
        
        -- If after business hours, move to next business day start
        IF current_hour >= business_day_end THEN
            current_time := date_trunc('day', current_time) + INTERVAL '1 day' + (business_day_start || ' hours')::INTERVAL;
            -- Check if next day is weekend
            current_dow := EXTRACT(DOW FROM current_time);
            IF current_dow = 0 OR current_dow = 6 THEN
                current_time := date_trunc('week', current_time) + INTERVAL '1 week' + INTERVAL '1 day' + (business_day_start || ' hours')::INTERVAL;
            END IF;
            CONTINUE;
        END IF;
        
        -- Calculate how many hours we can add today
        DECLARE
            hours_until_end_of_business INTEGER := business_day_end - current_hour;
            hours_to_add INTEGER := LEAST(remaining_hours, hours_until_end_of_business);
        BEGIN
            current_time := current_time + (hours_to_add || ' hours')::INTERVAL;
            remaining_hours := remaining_hours - hours_to_add;
        END;
    END LOOP;
    
    RETURN current_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and update SLA breaches
CREATE OR REPLACE FUNCTION check_sla_breaches()
RETURNS INTEGER AS $$
DECLARE
    tickets_updated INTEGER := 0;
    ticket_record RECORD;
BEGIN
    -- Check response SLA breaches for open tickets without first response
    FOR ticket_record IN 
        SELECT id, created_at, sla_response_hours, first_response_at
        FROM support_tickets 
        WHERE status IN ('open', 'in_progress') 
        AND first_response_at IS NULL 
        AND sla_response_breached = FALSE
        AND calculate_sla_deadline(created_at, sla_response_hours, TRUE) < NOW()
    LOOP
        UPDATE support_tickets 
        SET sla_response_breached = TRUE, updated_at = NOW()
        WHERE id = ticket_record.id;
        
        tickets_updated := tickets_updated + 1;
    END LOOP;
    
    -- Check resolution SLA breaches for unresolved tickets
    FOR ticket_record IN 
        SELECT id, created_at, sla_resolution_hours, resolved_at
        FROM support_tickets 
        WHERE status NOT IN ('resolved', 'closed') 
        AND resolved_at IS NULL 
        AND sla_resolution_hours IS NOT NULL
        AND sla_resolution_breached = FALSE
        AND calculate_sla_deadline(created_at, sla_resolution_hours, TRUE) < NOW()
    LOOP
        UPDATE support_tickets 
        SET sla_resolution_breached = TRUE, updated_at = NOW()
        WHERE id = ticket_record.id;
        
        tickets_updated := tickets_updated + 1;
    END LOOP;
    
    RETURN tickets_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE support_tickets IS 'Main support ticket system with tier-based SLA tracking';
COMMENT ON TABLE support_ticket_messages IS 'All messages and communications for support tickets';
COMMENT ON TABLE support_sla_config IS 'SLA configuration rules by subscription tier and ticket type';
COMMENT ON TABLE support_contact_methods IS 'Available support contact methods by subscription tier';
COMMENT ON TABLE support_analytics IS 'Support performance metrics and analytics data';

-- Insert migration record
INSERT INTO tenant_configs (tenant_id, config_key, config_value) 
VALUES ('migration', 'support_system_version', json_build_object('version', '002', 'created_at', NOW()))
ON CONFLICT (tenant_id, config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = NOW();
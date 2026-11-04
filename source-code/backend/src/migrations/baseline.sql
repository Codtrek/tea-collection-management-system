--
-- PostgreSQL database dump
--


-- Dumped from database version 18.6 (4e5fd08)
-- Dumped by pg_dump version 18.6 (Debian 18.6-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agent_day_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_day_status (
    agent_id integer NOT NULL,
    day date NOT NULL,
    status character varying(10) DEFAULT 'AVAILABLE'::character varying NOT NULL,
    source character varying(10),
    reason text,
    marked_by character varying(100),
    shift_started_at timestamp with time zone,
    shift_ended_at timestamp with time zone,
    CONSTRAINT agent_day_status_source_check CHECK (((source)::text = ANY ((ARRAY['self'::character varying, 'officer'::character varying])::text[]))),
    CONSTRAINT agent_day_status_status_check CHECK (((status)::text = ANY ((ARRAY['AVAILABLE'::character varying, 'ABSENT'::character varying])::text[])))
);


--
-- Name: agent_location_pings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_location_pings (
    id bigint NOT NULL,
    agent_id integer NOT NULL,
    recorded_at timestamp with time zone NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    lat numeric(9,6) NOT NULL,
    lng numeric(9,6) NOT NULL,
    accuracy_m numeric(8,2),
    source character varying(10) DEFAULT 'ping'::character varying NOT NULL,
    CONSTRAINT agent_location_pings_lat_check CHECK (((lat >= ('-90'::integer)::numeric) AND (lat <= (90)::numeric))),
    CONSTRAINT agent_location_pings_lng_check CHECK (((lng >= ('-180'::integer)::numeric) AND (lng <= (180)::numeric))),
    CONSTRAINT agent_location_pings_source_check CHECK (((source)::text = ANY ((ARRAY['ping'::character varying, 'checkin'::character varying])::text[])))
);


--
-- Name: agent_location_pings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agent_location_pings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_location_pings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_location_pings_id_seq OWNED BY public.agent_location_pings.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer,
    user_name character varying(100) NOT NULL,
    role character varying(20) NOT NULL,
    action character varying(200) NOT NULL,
    module character varying(40) NOT NULL,
    record character varying(120),
    record_href character varying(200),
    details text
);


--
-- Name: collection_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collection_agents (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    factory_id integer NOT NULL,
    is_available boolean DEFAULT true,
    hr_employee_id integer
);


--
-- Name: collection_agents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collection_agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: collection_agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collection_agents_id_seq OWNED BY public.collection_agents.id;


--
-- Name: complaints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.complaints (
    id integer NOT NULL,
    type character varying(30) NOT NULL,
    raised_by_user_id integer NOT NULL,
    collection_record_id character varying(20),
    fertilizer_request_id integer,
    description text,
    status character varying(20) DEFAULT 'open'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT complaints_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'acknowledged'::character varying, 'resolved'::character varying])::text[]))),
    CONSTRAINT complaints_type_check CHECK (((type)::text = ANY ((ARRAY['weight_mismatch'::character varying, 'fertilizer_quality'::character varying])::text[])))
);


--
-- Name: complaints_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.complaints_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: complaints_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.complaints_id_seq OWNED BY public.complaints.id;


--
-- Name: daily_plucking_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_plucking_records (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    manager_id integer NOT NULL,
    date date NOT NULL,
    weight_kg numeric(8,2) NOT NULL,
    notes text
);


--
-- Name: daily_plucking_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_plucking_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_plucking_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_plucking_records_id_seq OWNED BY public.daily_plucking_records.id;


--
-- Name: delivery_grade_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_grade_lines (
    id integer NOT NULL,
    delivery_id character varying(20) NOT NULL,
    grade character varying(10) NOT NULL,
    weight_kg numeric(10,2) NOT NULL,
    graded_by character varying(100) NOT NULL,
    graded_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT delivery_grade_lines_grade_check CHECK (((grade)::text = ANY ((ARRAY['super'::character varying, 'normal'::character varying])::text[]))),
    CONSTRAINT delivery_grade_lines_weight_kg_check CHECK ((weight_kg > (0)::numeric))
);


--
-- Name: delivery_grade_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.delivery_grade_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: delivery_grade_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.delivery_grade_lines_id_seq OWNED BY public.delivery_grade_lines.id;


--
-- Name: delivery_grade_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_grade_revisions (
    id integer NOT NULL,
    delivery_id character varying(20) NOT NULL,
    revision_no integer NOT NULL,
    kind character varying(20) NOT NULL,
    lines jsonb NOT NULL,
    total_kg numeric(10,2) NOT NULL,
    reason text,
    changed_by character varying(100) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_by character varying(100),
    approved_at timestamp with time zone,
    request_id integer,
    CONSTRAINT delivery_grade_revisions_kind_check CHECK (((kind)::text = ANY ((ARRAY['initial'::character varying, 'open_edit'::character varying, 'correction'::character varying])::text[])))
);


--
-- Name: delivery_grade_revisions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.delivery_grade_revisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: delivery_grade_revisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.delivery_grade_revisions_id_seq OWNED BY public.delivery_grade_revisions.id;


--
-- Name: device_push_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_push_tokens (
    token character varying(200) NOT NULL,
    user_id integer NOT NULL,
    platform character varying(10),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: employee_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_attendance (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    date date NOT NULL,
    status character varying(20) NOT NULL,
    day_hours numeric(5,2) DEFAULT 0 NOT NULL,
    day_ot_hours numeric(5,2) DEFAULT 0 NOT NULL,
    night_hours numeric(5,2) DEFAULT 0 NOT NULL,
    night_ot_hours numeric(5,2) DEFAULT 0 NOT NULL,
    marked_by character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT employee_attendance_status_check CHECK (((status)::text = ANY ((ARRAY['Present'::character varying, 'Absent'::character varying, 'Leave'::character varying, 'Half-day'::character varying])::text[])))
);


--
-- Name: employee_attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_attendance_id_seq OWNED BY public.employee_attendance.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    user_id integer,
    name character varying(100) NOT NULL,
    nic character varying(20) NOT NULL,
    dob date,
    contact character varying(20),
    address text,
    role character varying(50) NOT NULL,
    department character varying(50),
    hire_date date,
    employment_type character varying(20) DEFAULT 'Permanent'::character varying NOT NULL,
    status character varying(20) DEFAULT 'Active'::character varying NOT NULL,
    bank_name character varying(100),
    bank_branch character varying(100),
    bank_account character varying(50),
    day_rate numeric(8,2) DEFAULT 0 NOT NULL,
    day_ot_rate numeric(8,2) DEFAULT 0 NOT NULL,
    night_rate numeric(8,2) DEFAULT 0 NOT NULL,
    night_ot_rate numeric(8,2) DEFAULT 0 NOT NULL,
    has_login boolean DEFAULT false NOT NULL,
    last_updated_by character varying(100),
    last_updated_on timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT employees_employment_type_check CHECK (((employment_type)::text = ANY ((ARRAY['Permanent'::character varying, 'Contract'::character varying, 'Casual'::character varying])::text[]))),
    CONSTRAINT employees_status_check CHECK (((status)::text = ANY ((ARRAY['Active'::character varying, 'Suspended'::character varying, 'Inactive'::character varying])::text[])))
);


--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: estate_advances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estate_advances (
    id character varying(20) NOT NULL,
    estate_id integer NOT NULL,
    estate_name character varying(100) NOT NULL,
    amount numeric(12,2) NOT NULL,
    reason text NOT NULL,
    date_issued date NOT NULL,
    issued_by character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'pending_deduction'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT estate_advances_status_check CHECK (((status)::text = ANY ((ARRAY['pending_deduction'::character varying, 'deducted'::character varying])::text[])))
);


--
-- Name: estate_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estate_documents (
    id integer NOT NULL,
    estate_id integer NOT NULL,
    name character varying(255) NOT NULL,
    uploaded_on date DEFAULT CURRENT_DATE NOT NULL
);


--
-- Name: estate_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estate_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estate_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estate_documents_id_seq OWNED BY public.estate_documents.id;


--
-- Name: estate_employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estate_employees (
    id integer NOT NULL,
    user_id integer NOT NULL,
    estate_id integer NOT NULL,
    name character varying(100) NOT NULL,
    date_of_birth date NOT NULL,
    nic character varying(20) NOT NULL,
    role character varying(30) NOT NULL,
    is_active boolean DEFAULT true,
    CONSTRAINT estate_employees_role_check CHECK (((role)::text = ANY ((ARRAY['manager'::character varying, 'plucking_employee'::character varying])::text[])))
);


--
-- Name: estate_employees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estate_employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estate_employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estate_employees_id_seq OWNED BY public.estate_employees.id;


--
-- Name: estate_route_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estate_route_mapping (
    id integer NOT NULL,
    route_id integer NOT NULL,
    estate_id integer NOT NULL,
    factory_id integer NOT NULL
);


--
-- Name: estate_route_mapping_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estate_route_mapping_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estate_route_mapping_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estate_route_mapping_id_seq OWNED BY public.estate_route_mapping.id;


--
-- Name: estates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estates (
    id integer NOT NULL,
    owner_id integer NOT NULL,
    name character varying(100) NOT NULL,
    location text NOT NULL,
    address text,
    route_id integer,
    route_name character varying(100),
    self_delivery boolean DEFAULT false NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    ytd_deliveries_kg numeric(10,2) DEFAULT 0 NOT NULL,
    bank_name character varying(100),
    bank_branch character varying(100),
    bank_account character varying(30),
    last_updated_by character varying(100),
    last_updated_on timestamp without time zone,
    registered_on date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    lat numeric(9,6),
    lng numeric(9,6),
    CONSTRAINT estates_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


--
-- Name: estates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estates_id_seq OWNED BY public.estates.id;


--
-- Name: expense_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_entries (
    id character varying(20) NOT NULL,
    category character varying(20) NOT NULL,
    description character varying(200) NOT NULL,
    amount numeric(12,2) NOT NULL,
    entry_date date NOT NULL,
    entered_by character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT expense_entries_category_check CHECK (((category)::text = ANY ((ARRAY['Utilities'::character varying, 'Maintenance'::character varying, 'Miscellaneous'::character varying, 'Other'::character varying])::text[])))
);


--
-- Name: factories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.factories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    location text
);


--
-- Name: factories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.factories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: factories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.factories_id_seq OWNED BY public.factories.id;


--
-- Name: factory_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.factory_admins (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    factory_id integer NOT NULL
);


--
-- Name: factory_admins_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.factory_admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: factory_admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.factory_admins_id_seq OWNED BY public.factory_admins.id;


--
-- Name: factory_employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.factory_employees (
    id integer NOT NULL,
    user_id integer NOT NULL,
    factory_id integer NOT NULL,
    name character varying(100) NOT NULL,
    date_of_birth date,
    nic character varying(20) NOT NULL,
    role character varying(30) NOT NULL,
    is_active boolean DEFAULT true,
    CONSTRAINT factory_employees_role_check CHECK (((role)::text = ANY ((ARRAY['collection_agent'::character varying, 'receiving_officer'::character varying, 'factory_admin'::character varying, 'factory_officer'::character varying, 'factory_manager'::character varying])::text[])))
);


--
-- Name: factory_employees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.factory_employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: factory_employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.factory_employees_id_seq OWNED BY public.factory_employees.id;


--
-- Name: fertilizer_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fertilizer_batches (
    id integer NOT NULL,
    item character varying(100) NOT NULL,
    category character varying(20) DEFAULT 'Fertilizer'::character varying NOT NULL,
    quantity_kg numeric(10,2) NOT NULL,
    unit character varying(10) DEFAULT 'kg'::character varying NOT NULL,
    received_date date NOT NULL,
    expiry_date date NOT NULL,
    location character varying(100),
    supplier character varying(100),
    lot_number character varying(50),
    quality_notes text,
    discarded boolean DEFAULT false NOT NULL,
    last_updated_by character varying(100),
    last_updated_on timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT fertilizer_batches_category_check CHECK (((category)::text = ANY ((ARRAY['Fertilizer'::character varying, 'Beneficiary'::character varying])::text[]))),
    CONSTRAINT fertilizer_batches_unit_check CHECK (((unit)::text = ANY ((ARRAY['kg'::character varying, 'bags'::character varying])::text[])))
);


--
-- Name: fertilizer_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fertilizer_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fertilizer_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fertilizer_batches_id_seq OWNED BY public.fertilizer_batches.id;


--
-- Name: fertilizer_charges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fertilizer_charges (
    id integer NOT NULL,
    stock_movement_id integer NOT NULL,
    estate_id integer,
    fertilizer_request_id integer,
    rate_per_kg numeric(8,2) NOT NULL,
    quantity_kg numeric(10,2) NOT NULL,
    total_charge numeric(10,2) NOT NULL,
    settlement_id character varying(20),
    calculated_at timestamp without time zone DEFAULT now()
);


--
-- Name: fertilizer_charges_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fertilizer_charges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fertilizer_charges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fertilizer_charges_id_seq OWNED BY public.fertilizer_charges.id;


--
-- Name: fertilizer_dispatches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fertilizer_dispatches (
    id integer NOT NULL,
    fertilizer_request_id integer NOT NULL,
    agent_id integer NOT NULL,
    collection_record_id character varying(20),
    dispatched_at timestamp without time zone,
    delivered_at timestamp without time zone,
    status character varying(20) DEFAULT 'scheduled'::character varying,
    CONSTRAINT fertilizer_dispatches_status_check CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'in_transit'::character varying, 'delivered'::character varying])::text[])))
);


--
-- Name: fertilizer_dispatches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fertilizer_dispatches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fertilizer_dispatches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fertilizer_dispatches_id_seq OWNED BY public.fertilizer_dispatches.id;


--
-- Name: fertilizer_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fertilizer_requests (
    id integer NOT NULL,
    requested_by integer,
    estate_id integer NOT NULL,
    owner_id integer NOT NULL,
    item character varying(100) DEFAULT 'Urea Fertilizer'::character varying NOT NULL,
    quantity_kg numeric(10,2) NOT NULL,
    justification text,
    owner_status character varying(20) DEFAULT 'pending'::character varying,
    factory_id integer,
    factory_status character varying(20) DEFAULT 'pending'::character varying,
    origin character varying(10) DEFAULT 'web'::character varying NOT NULL,
    status character varying(20) DEFAULT 'Submitted'::character varying NOT NULL,
    approved_qty_kg numeric(10,2),
    dispatched_qty_kg numeric(10,2) DEFAULT 0 NOT NULL,
    decided_by character varying(100),
    decided_on timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT fertilizer_requests_factory_status_check CHECK (((factory_status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT fertilizer_requests_origin_check CHECK (((origin)::text = ANY ((ARRAY['mobile'::character varying, 'web'::character varying])::text[]))),
    CONSTRAINT fertilizer_requests_owner_status_check CHECK (((owner_status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT fertilizer_requests_status_check CHECK (((status)::text = ANY ((ARRAY['Submitted'::character varying, 'Approved'::character varying, 'Partially Dispatched'::character varying, 'Dispatched'::character varying, 'Deducted'::character varying, 'Rejected'::character varying, 'Cancelled'::character varying])::text[])))
);


--
-- Name: fertilizer_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fertilizer_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fertilizer_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fertilizer_requests_id_seq OWNED BY public.fertilizer_requests.id;


--
-- Name: grade_correction_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grade_correction_requests (
    id integer NOT NULL,
    delivery_id character varying(20) NOT NULL,
    lines jsonb NOT NULL,
    reason text NOT NULL,
    status character varying(10) DEFAULT 'pending'::character varying NOT NULL,
    requested_by character varying(100) NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    decided_by character varying(100),
    decided_at timestamp with time zone,
    decision_note text,
    CONSTRAINT grade_correction_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: grade_correction_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grade_correction_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grade_correction_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grade_correction_requests_id_seq OWNED BY public.grade_correction_requests.id;


--
-- Name: grade_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grade_rates (
    id character varying(20) NOT NULL,
    super_rate numeric(8,2) NOT NULL,
    normal_rate numeric(8,2) NOT NULL,
    effective_date date NOT NULL,
    set_by character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: grading_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grading_notifications (
    id integer NOT NULL,
    delivery_id character varying(20) NOT NULL,
    kind character varying(12) NOT NULL,
    status character varying(10) DEFAULT 'queued'::character varying NOT NULL,
    send_after timestamp with time zone NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    sent_at timestamp with time zone,
    payload jsonb,
    dedupe_key character varying(80) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT grading_notifications_kind_check CHECK (((kind)::text = ANY ((ARRAY['graded'::character varying, 'correction'::character varying])::text[]))),
    CONSTRAINT grading_notifications_status_check CHECK (((status)::text = ANY ((ARRAY['queued'::character varying, 'sending'::character varying, 'sent'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: grading_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grading_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grading_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grading_notifications_id_seq OWNED BY public.grading_notifications.id;


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(150),
    body text,
    is_read boolean DEFAULT false,
    reference_id integer,
    reference_type character varying(50),
    created_at timestamp without time zone DEFAULT now(),
    dedupe_key character varying(80),
    CONSTRAINT notifications_type_check CHECK (((type)::text = ANY ((ARRAY['delivery_confirmation'::character varying, 'otp'::character varying, 'complaint'::character varying, 'fertilizer_approval'::character varying, 'payment_update'::character varying, 'collection_complete'::character varying, 'no_agents'::character varying, 'cover_request'::character varying, 'cover_response'::character varying, 'missed_checkin'::character varying, 'route_reassigned'::character varying, 'exception_request'::character varying, 'delivery_graded'::character varying, 'grade_correction'::character varying])::text[])))
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: payroll_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_runs (
    id character varying(20) NOT NULL,
    employee_id integer NOT NULL,
    employee_name character varying(100) NOT NULL,
    period character varying(20) NOT NULL,
    day_hours numeric(6,2) DEFAULT 0 NOT NULL,
    day_ot_hours numeric(6,2) DEFAULT 0 NOT NULL,
    night_hours numeric(6,2) DEFAULT 0 NOT NULL,
    night_ot_hours numeric(6,2) DEFAULT 0 NOT NULL,
    day_rate numeric(8,2) DEFAULT 0 NOT NULL,
    day_ot_rate numeric(8,2) DEFAULT 0 NOT NULL,
    night_rate numeric(8,2) DEFAULT 0 NOT NULL,
    night_ot_rate numeric(8,2) DEFAULT 0 NOT NULL,
    gross numeric(12,2) DEFAULT 0 NOT NULL,
    deductions_advances numeric(12,2) DEFAULT 0 NOT NULL,
    deductions_other numeric(12,2) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'Pending'::character varying NOT NULL,
    missing_bank boolean DEFAULT false NOT NULL,
    processed_by character varying(100),
    processed_on timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT payroll_runs_status_check CHECK (((status)::text = ANY ((ARRAY['Pending'::character varying, 'Processed'::character varying])::text[])))
);


--
-- Name: plucking_completion_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plucking_completion_reports (
    id integer NOT NULL,
    manager_id integer NOT NULL,
    estate_id integer NOT NULL,
    report_date date NOT NULL,
    total_weight numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'submitted'::character varying,
    submitted_at timestamp without time zone DEFAULT now(),
    CONSTRAINT plucking_completion_reports_status_check CHECK (((status)::text = ANY ((ARRAY['submitted'::character varying, 'reviewed'::character varying])::text[])))
);


--
-- Name: plucking_completion_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plucking_completion_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plucking_completion_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plucking_completion_reports_id_seq OWNED BY public.plucking_completion_reports.id;


--
-- Name: plucking_employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plucking_employees (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    total_weight_plucked_lifetime numeric(10,2) DEFAULT 0,
    avg_monthly_plucking_weight numeric(10,2) DEFAULT 0,
    rating numeric(3,2),
    CONSTRAINT plucking_employees_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);


--
-- Name: plucking_employees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plucking_employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plucking_employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plucking_employees_id_seq OWNED BY public.plucking_employees.id;


--
-- Name: receiving_officers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receiving_officers (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    factory_id integer NOT NULL
);


--
-- Name: receiving_officers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.receiving_officers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: receiving_officers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.receiving_officers_id_seq OWNED BY public.receiving_officers.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    role character varying(20) NOT NULL,
    module character varying(30) NOT NULL,
    level character varying(10) NOT NULL,
    CONSTRAINT role_permissions_level_check CHECK (((level)::text = ANY ((ARRAY['none'::character varying, 'view'::character varying, 'edit'::character varying, 'approve'::character varying])::text[]))),
    CONSTRAINT role_permissions_role_check CHECK (((role)::text = ANY ((ARRAY['Administrator'::character varying, 'Officer'::character varying, 'Manager'::character varying, 'ReceivingOfficer'::character varying])::text[])))
);


--
-- Name: route_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.route_assignments (
    id integer NOT NULL,
    route_id integer NOT NULL,
    agent_id integer NOT NULL,
    type character varying(10) NOT NULL,
    status character varying(10) DEFAULT 'PENDING'::character varying NOT NULL,
    valid_from date NOT NULL,
    valid_to date,
    created_by character varying(100) NOT NULL,
    accepted_at timestamp without time zone,
    responded_at timestamp without time zone,
    expires_at timestamp without time zone,
    reason text,
    covers_assignment_id integer,
    stop_scope jsonb,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT route_assignments_check CHECK (((valid_to IS NULL) OR (valid_to >= valid_from))),
    CONSTRAINT route_assignments_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'ACTIVE'::character varying, 'DECLINED'::character varying, 'EXPIRED'::character varying, 'CANCELLED'::character varying])::text[]))),
    CONSTRAINT route_assignments_type_check CHECK (((type)::text = ANY ((ARRAY['PERMANENT'::character varying, 'COVER'::character varying])::text[])))
);


--
-- Name: route_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.route_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: route_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.route_assignments_id_seq OWNED BY public.route_assignments.id;


--
-- Name: route_neighbours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.route_neighbours (
    route_id integer NOT NULL,
    neighbour_route_id integer NOT NULL,
    CONSTRAINT route_neighbours_check CHECK ((route_id <> neighbour_route_id))
);


--
-- Name: routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.routes (
    id integer NOT NULL,
    factory_id integer NOT NULL,
    name character varying(100)
);


--
-- Name: routes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.routes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: routes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.routes_id_seq OWNED BY public.routes.id;


--
-- Name: salary_advances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salary_advances (
    id character varying(20) NOT NULL,
    employee_id integer NOT NULL,
    employee_name character varying(100) NOT NULL,
    amount numeric(12,2) NOT NULL,
    reason text NOT NULL,
    date_requested date NOT NULL,
    status character varying(20) DEFAULT 'Pending'::character varying NOT NULL,
    deducted boolean DEFAULT false NOT NULL,
    decided_by character varying(100),
    decided_on timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT salary_advances_status_check CHECK (((status)::text = ANY ((ARRAY['Pending'::character varying, 'Approved'::character varying, 'Rejected'::character varying])::text[])))
);


--
-- Name: settlement_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settlement_adjustments (
    id integer NOT NULL,
    estate_id integer NOT NULL,
    delivery_id character varying(20) NOT NULL,
    request_id integer NOT NULL,
    origin_settlement_id character varying(20) NOT NULL,
    super_kg_delta numeric(10,2) NOT NULL,
    normal_kg_delta numeric(10,2) NOT NULL,
    super_rate numeric(8,2) NOT NULL,
    normal_rate numeric(8,2) NOT NULL,
    amount_rs numeric(12,2) NOT NULL,
    status character varying(10) DEFAULT 'pending'::character varying NOT NULL,
    applied_settlement_id character varying(20),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT settlement_adjustments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'applied'::character varying])::text[])))
);


--
-- Name: settlement_adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.settlement_adjustments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: settlement_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.settlement_adjustments_id_seq OWNED BY public.settlement_adjustments.id;


--
-- Name: settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settlements (
    id character varying(20) NOT NULL,
    estate_id integer NOT NULL,
    estate_name character varying(100) NOT NULL,
    period character varying(20) NOT NULL,
    super_kg numeric(10,2) DEFAULT 0 NOT NULL,
    normal_kg numeric(10,2) DEFAULT 0 NOT NULL,
    super_rate numeric(8,2) NOT NULL,
    normal_rate numeric(8,2) NOT NULL,
    transport_cost numeric(10,2) DEFAULT 0 NOT NULL,
    fertilizer_deduction numeric(10,2) DEFAULT 0 NOT NULL,
    advance_deduction numeric(10,2) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    self_delivery boolean DEFAULT false NOT NULL,
    missing_bank boolean DEFAULT false NOT NULL,
    processed_by character varying(100),
    processed_on timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    adjustment_amount numeric(12,2) DEFAULT 0 NOT NULL,
    CONSTRAINT settlements_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processed'::character varying])::text[])))
);


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_movements (
    id integer NOT NULL,
    batch_id integer NOT NULL,
    type character varying(10) NOT NULL,
    quantity_kg numeric(10,2) NOT NULL,
    movement_date date DEFAULT CURRENT_DATE NOT NULL,
    destination character varying(100),
    estate_id integer,
    linked_request_id integer,
    supplier character varying(100),
    notes text,
    recorded_by character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT stock_movements_type_check CHECK (((type)::text = ANY ((ARRAY['Incoming'::character varying, 'Outgoing'::character varying])::text[])))
);


--
-- Name: stock_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_movements_id_seq OWNED BY public.stock_movements.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    key character varying(60) NOT NULL,
    value jsonb NOT NULL,
    updated_by character varying(100),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: tea_collection_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tea_collection_records (
    id character varying(20) NOT NULL,
    estate_id integer,
    estate_ref character varying(20),
    estate_name character varying(100) NOT NULL,
    route_id integer,
    route_name character varying(100) NOT NULL,
    weight_kg numeric(10,2) NOT NULL,
    status character varying(30) DEFAULT 'submitted'::character varying NOT NULL,
    collection_date date NOT NULL,
    agent_id integer,
    agent_name character varying(100) DEFAULT 'Self-delivered'::character varying NOT NULL,
    photos jsonb DEFAULT '[]'::jsonb NOT NULL,
    timeline jsonb DEFAULT '[]'::jsonb NOT NULL,
    provisional jsonb,
    mismatch jsonb,
    last_updated_by character varying(100),
    last_updated_on timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    graded_at timestamp with time zone,
    locked_at timestamp with time zone,
    finalized_at timestamp with time zone,
    settlement_id character varying(20),
    CONSTRAINT tea_collection_records_status_check CHECK (((status)::text = ANY ((ARRAY['submitted'::character varying, 'approved'::character varying, 'agent_assigned'::character varying, 'collected'::character varying, 'confirmed'::character varying, 'pending_agent_confirmation'::character varying])::text[])))
);


--
-- Name: tea_estate_managers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tea_estate_managers (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    estate_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT now()
);


--
-- Name: tea_estate_managers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tea_estate_managers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tea_estate_managers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tea_estate_managers_id_seq OWNED BY public.tea_estate_managers.id;


--
-- Name: tea_estate_owners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tea_estate_owners (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    nic character varying(20),
    contact character varying(15),
    email character varying(100)
);


--
-- Name: tea_estate_owners_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tea_estate_owners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tea_estate_owners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tea_estate_owners_id_seq OWNED BY public.tea_estate_owners.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    phone character varying(15) NOT NULL,
    password_hash text NOT NULL,
    role character varying(30) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    nic character varying(12),
    name character varying(32) NOT NULL,
    must_change_password boolean DEFAULT false NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['estate_owner'::character varying, 'estate_manager'::character varying, 'plucking_employee'::character varying, 'collection_agent'::character varying, 'receiving_officer'::character varying, 'factory_admin'::character varying, 'factory_officer'::character varying, 'factory_manager'::character varying])::text[]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'suspended'::character varying])::text[])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: agent_location_pings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_location_pings ALTER COLUMN id SET DEFAULT nextval('public.agent_location_pings_id_seq'::regclass);


--
-- Name: collection_agents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_agents ALTER COLUMN id SET DEFAULT nextval('public.collection_agents_id_seq'::regclass);


--
-- Name: complaints id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complaints ALTER COLUMN id SET DEFAULT nextval('public.complaints_id_seq'::regclass);


--
-- Name: daily_plucking_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_plucking_records ALTER COLUMN id SET DEFAULT nextval('public.daily_plucking_records_id_seq'::regclass);


--
-- Name: delivery_grade_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_grade_lines ALTER COLUMN id SET DEFAULT nextval('public.delivery_grade_lines_id_seq'::regclass);


--
-- Name: delivery_grade_revisions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_grade_revisions ALTER COLUMN id SET DEFAULT nextval('public.delivery_grade_revisions_id_seq'::regclass);


--
-- Name: employee_attendance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_attendance ALTER COLUMN id SET DEFAULT nextval('public.employee_attendance_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: estate_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estate_documents ALTER COLUMN id SET DEFAULT nextval('public.estate_documents_id_seq'::regclass);


--
-- Name: estate_employees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estate_employees ALTER COLUMN id SET DEFAULT nextval('public.estate_employees_id_seq'::regclass);


--
-- Name: estate_route_mapping id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estate_route_mapping ALTER COLUMN id SET DEFAULT nextval('public.estate_route_mapping_id_seq'::regclass);


--
-- Name: estates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estates ALTER COLUMN id SET DEFAULT nextval('public.estates_id_seq'::regclass);


--
-- Name: factories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factories ALTER COLUMN id SET DEFAULT nextval('public.factories_id_seq'::regclass);


--
-- Name: factory_admins id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factory_admins ALTER COLUMN id SET DEFAULT nextval('public.factory_admins_id_seq'::regclass);


--
-- Name: factory_employees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factory_employees ALTER COLUMN id SET DEFAULT nextval('public.factory_employees_id_seq'::regclass);


--
-- Name: fertilizer_batches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_batches ALTER COLUMN id SET DEFAULT nextval('public.fertilizer_batches_id_seq'::regclass);


--
-- Name: fertilizer_charges id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_charges ALTER COLUMN id SET DEFAULT nextval('public.fertilizer_charges_id_seq'::regclass);


--
-- Name: fertilizer_dispatches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_dispatches ALTER COLUMN id SET DEFAULT nextval('public.fertilizer_dispatches_id_seq'::regclass);


--
-- Name: fertilizer_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_requests ALTER COLUMN id SET DEFAULT nextval('public.fertilizer_requests_id_seq'::regclass);


--
-- Name: grade_correction_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_correction_requests ALTER COLUMN id SET DEFAULT nextval('public.grade_correction_requests_id_seq'::regclass);


--
-- Name: grading_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_notifications ALTER COLUMN id SET DEFAULT nextval('public.grading_notifications_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: plucking_completion_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plucking_completion_reports ALTER COLUMN id SET DEFAULT nextval('public.plucking_completion_reports_id_seq'::regclass);


--
-- Name: plucking_employees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plucking_employees ALTER COLUMN id SET DEFAULT nextval('public.plucking_employees_id_seq'::regclass);


--
-- Name: receiving_officers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receiving_officers ALTER COLUMN id SET DEFAULT nextval('public.receiving_officers_id_seq'::regclass);


--
-- Name: route_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_assignments ALTER COLUMN id SET DEFAULT nextval('public.route_assignments_id_seq'::regclass);


--
-- Name: routes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes ALTER COLUMN id SET DEFAULT nextval('public.routes_id_seq'::regclass);


--
-- Name: settlement_adjustments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_adjustments ALTER COLUMN id SET DEFAULT nextval('public.settlement_adjustments_id_seq'::regclass);


--
-- Name: stock_movements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements ALTER COLUMN id SET DEFAULT nextval('public.stock_movements_id_seq'::regclass);


--
-- Name: tea_estate_managers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tea_estate_managers ALTER COLUMN id SET DEFAULT nextval('public.tea_estate_managers_id_seq'::regclass);


--
-- Name: tea_estate_owners id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tea_estate_owners ALTER COLUMN id SET DEFAULT nextval('public.tea_estate_owners_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: agent_day_status agent_day_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_day_status
    ADD CONSTRAINT agent_day_status_pkey PRIMARY KEY (agent_id, day);


--
-- Name: agent_location_pings agent_location_pings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_location_pings
    ADD CONSTRAINT agent_location_pings_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: collection_agents collection_agents_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_agents
    ADD CONSTRAINT collection_agents_employee_id_key UNIQUE (employee_id);


--
-- Name: collection_agents collection_agents_hr_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_agents
    ADD CONSTRAINT collection_agents_hr_employee_id_key UNIQUE (hr_employee_id);


--
-- Name: collection_agents collection_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_agents
    ADD CONSTRAINT collection_agents_pkey PRIMARY KEY (id);


--
-- Name: complaints complaints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_pkey PRIMARY KEY (id);


--
-- Name: daily_plucking_records daily_plucking_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_plucking_records
    ADD CONSTRAINT daily_plucking_records_pkey PRIMARY KEY (id);


--
-- Name: delivery_grade_lines delivery_grade_lines_delivery_id_grade_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_grade_lines
    ADD CONSTRAINT delivery_grade_lines_delivery_id_grade_key UNIQUE (delivery_id, grade);


--
-- Name: delivery_grade_lines delivery_grade_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_grade_lines
    ADD CONSTRAINT delivery_grade_lines_pkey PRIMARY KEY (id);


--
-- Name: delivery_grade_revisions delivery_grade_revisions_delivery_id_revision_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_grade_revisions
    ADD CONSTRAINT delivery_grade_revisions_delivery_id_revision_no_key UNIQUE (delivery_id, revision_no);


--
-- Name: delivery_grade_revisions delivery_grade_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_grade_revisions
    ADD CONSTRAINT delivery_grade_revisions_pkey PRIMARY KEY (id);


--
-- Name: device_push_tokens device_push_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_push_tokens
    ADD CONSTRAINT device_push_tokens_pkey PRIMARY KEY (token);


--
-- Name: employee_attendance employee_attendance_employee_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_attendance
    ADD CONSTRAINT employee_attendance_employee_id_date_key UNIQUE (employee_id, date);


--
-- Name: employee_attendance employee_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_attendance
    ADD CONSTRAINT employee_attendance_pkey PRIMARY KEY (id);


--
-- Name: employees employees_nic_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_nic_key UNIQUE (nic);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: employees employees_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_key UNIQUE (user_id);


--
-- Name: estate_advances estate_advances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estate_advances
    ADD CONSTRAINT estate_advances_pkey PRIMARY KEY (id);


--
-- Name: estate_documents estate_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estate_documents
    ADD CONSTRAINT estate_documents_pkey PRIMARY KEY (id);


--
-- Name: estate_employees estate_employees_nic_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estate_employees
    ADD CONSTRAINT estate_employees_nic_key UNIQUE (nic);


--
-- Name: estate_employees estate_employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estate_employees
    ADD CONSTRAINT estate_employees_pkey PRIMARY KEY (id);


--
-- Name: estate_employees estate_employees_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estate_employees
    ADD CONSTRAINT estate_employees_user_id_key UNIQUE (user_id);


--
-- Name: estate_route_mapping estate_route_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estate_route_mapping
    ADD CONSTRAINT estate_route_mapping_pkey PRIMARY KEY (id);


--
-- Name: estates estates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estates
    ADD CONSTRAINT estates_pkey PRIMARY KEY (id);


--
-- Name: expense_entries expense_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_entries
    ADD CONSTRAINT expense_entries_pkey PRIMARY KEY (id);


--
-- Name: factories factories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factories
    ADD CONSTRAINT factories_pkey PRIMARY KEY (id);


--
-- Name: factory_admins factory_admins_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factory_admins
    ADD CONSTRAINT factory_admins_employee_id_key UNIQUE (employee_id);


--
-- Name: factory_admins factory_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factory_admins
    ADD CONSTRAINT factory_admins_pkey PRIMARY KEY (id);


--
-- Name: factory_employees factory_employees_nic_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factory_employees
    ADD CONSTRAINT factory_employees_nic_key UNIQUE (nic);


--
-- Name: factory_employees factory_employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factory_employees
    ADD CONSTRAINT factory_employees_pkey PRIMARY KEY (id);


--
-- Name: factory_employees factory_employees_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factory_employees
    ADD CONSTRAINT factory_employees_user_id_key UNIQUE (user_id);


--
-- Name: fertilizer_batches fertilizer_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_batches
    ADD CONSTRAINT fertilizer_batches_pkey PRIMARY KEY (id);


--
-- Name: fertilizer_charges fertilizer_charges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_charges
    ADD CONSTRAINT fertilizer_charges_pkey PRIMARY KEY (id);


--
-- Name: fertilizer_charges fertilizer_charges_stock_movement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_charges
    ADD CONSTRAINT fertilizer_charges_stock_movement_id_key UNIQUE (stock_movement_id);


--
-- Name: fertilizer_dispatches fertilizer_dispatches_fertilizer_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_dispatches
    ADD CONSTRAINT fertilizer_dispatches_fertilizer_request_id_key UNIQUE (fertilizer_request_id);


--
-- Name: fertilizer_dispatches fertilizer_dispatches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_dispatches
    ADD CONSTRAINT fertilizer_dispatches_pkey PRIMARY KEY (id);


--
-- Name: fertilizer_requests fertilizer_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_requests
    ADD CONSTRAINT fertilizer_requests_pkey PRIMARY KEY (id);


--
-- Name: grade_correction_requests grade_correction_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_correction_requests
    ADD CONSTRAINT grade_correction_requests_pkey PRIMARY KEY (id);


--
-- Name: grade_rates grade_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_rates
    ADD CONSTRAINT grade_rates_pkey PRIMARY KEY (id);


--
-- Name: grading_notifications grading_notifications_dedupe_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_notifications
    ADD CONSTRAINT grading_notifications_dedupe_key_key UNIQUE (dedupe_key);


--
-- Name: grading_notifications grading_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_notifications
    ADD CONSTRAINT grading_notifications_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payroll_runs payroll_runs_employee_id_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT payroll_runs_employee_id_period_key UNIQUE (employee_id, period);


--
-- Name: payroll_runs payroll_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT payroll_runs_pkey PRIMARY KEY (id);


--
-- Name: plucking_completion_reports plucking_completion_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plucking_completion_reports
    ADD CONSTRAINT plucking_completion_reports_pkey PRIMARY KEY (id);


--
-- Name: plucking_employees plucking_employees_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plucking_employees
    ADD CONSTRAINT plucking_employees_employee_id_key UNIQUE (employee_id);


--
-- Name: plucking_employees plucking_employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plucking_employees
    ADD CONSTRAINT plucking_employees_pkey PRIMARY KEY (id);


--
-- Name: receiving_officers receiving_officers_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receiving_officers
    ADD CONSTRAINT receiving_officers_employee_id_key UNIQUE (employee_id);


--
-- Name: receiving_officers receiving_officers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receiving_officers
    ADD CONSTRAINT receiving_officers_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role, module);


--
-- Name: route_assignments route_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_assignments
    ADD CONSTRAINT route_assignments_pkey PRIMARY KEY (id);


--
-- Name: route_neighbours route_neighbours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_neighbours
    ADD CONSTRAINT route_neighbours_pkey PRIMARY KEY (route_id, neighbour_route_id);


--
-- Name: routes routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (id);


--
-- Name: salary_advances salary_advances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_advances
    ADD CONSTRAINT salary_advances_pkey PRIMARY KEY (id);


--
-- Name: settlement_adjustments settlement_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_adjustments
    ADD CONSTRAINT settlement_adjustments_pkey PRIMARY KEY (id);


--
-- Name: settlement_adjustments settlement_adjustments_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_adjustments
    ADD CONSTRAINT settlement_adjustments_request_id_key UNIQUE (request_id);


--
-- Name: settlements settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: tea_collection_records tea_collection_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tea_collection_records
    ADD CONSTRAINT tea_collection_records_pkey PRIMARY KEY (id);


--
-- Name: tea_estate_managers tea_estate_managers_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tea_estate_managers
    ADD CONSTRAINT tea_estate_managers_employee_id_key UNIQUE (employee_id);


--
-- Name: tea_estate_managers tea_estate_managers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tea_estate_managers
    ADD CONSTRAINT tea_estate_managers_pkey PRIMARY KEY (id);


--
-- Name: tea_estate_owners tea_estate_owners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tea_estate_owners
    ADD CONSTRAINT tea_estate_owners_pkey PRIMARY KEY (id);


--
-- Name: tea_estate_owners tea_estate_owners_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tea_estate_owners
    ADD CONSTRAINT tea_estate_owners_user_id_key UNIQUE (user_id);


--
-- Name: users users_nic_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_nic_unique UNIQUE (nic);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_adjustments_estate_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adjustments_estate_status ON public.settlement_adjustments USING btree (estate_id, status);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_module ON public.audit_logs USING btree (module);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_name);


--
-- Name: idx_collection_records_estate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_records_estate ON public.tea_collection_records USING btree (estate_id);


--
-- Name: idx_collection_records_settlement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_records_settlement ON public.tea_collection_records USING btree (settlement_id);


--
-- Name: idx_collection_records_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_records_status ON public.tea_collection_records USING btree (status);


--
-- Name: idx_daily_plucking_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_plucking_date ON public.daily_plucking_records USING btree (date);


--
-- Name: idx_daily_plucking_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_plucking_employee ON public.daily_plucking_records USING btree (employee_id);


--
-- Name: idx_employee_attendance_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_attendance_date ON public.employee_attendance USING btree (date);


--
-- Name: idx_employee_attendance_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_attendance_employee ON public.employee_attendance USING btree (employee_id);


--
-- Name: idx_estate_advances_estate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estate_advances_estate ON public.estate_advances USING btree (estate_id);


--
-- Name: idx_estate_documents_estate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estate_documents_estate ON public.estate_documents USING btree (estate_id);


--
-- Name: idx_estate_employees_estate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estate_employees_estate ON public.estate_employees USING btree (estate_id);


--
-- Name: idx_estates_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estates_owner ON public.estates USING btree (owner_id);


--
-- Name: idx_expense_entries_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_entries_date ON public.expense_entries USING btree (entry_date);


--
-- Name: idx_fertilizer_batches_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fertilizer_batches_item ON public.fertilizer_batches USING btree (item);


--
-- Name: idx_fertilizer_charges_estate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fertilizer_charges_estate ON public.fertilizer_charges USING btree (estate_id);


--
-- Name: idx_fertilizer_charges_settlement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fertilizer_charges_settlement ON public.fertilizer_charges USING btree (settlement_id);


--
-- Name: idx_fertilizer_requests_estate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fertilizer_requests_estate ON public.fertilizer_requests USING btree (estate_id);


--
-- Name: idx_fertilizer_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fertilizer_requests_status ON public.fertilizer_requests USING btree (status);


--
-- Name: idx_grade_lines_delivery; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grade_lines_delivery ON public.delivery_grade_lines USING btree (delivery_id);


--
-- Name: idx_grade_rates_effective; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grade_rates_effective ON public.grade_rates USING btree (effective_date DESC);


--
-- Name: idx_grade_revisions_delivery; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grade_revisions_delivery ON public.delivery_grade_revisions USING btree (delivery_id);


--
-- Name: idx_grading_notifications_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grading_notifications_due ON public.grading_notifications USING btree (status, send_after);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_payroll_runs_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_runs_employee ON public.payroll_runs USING btree (employee_id);


--
-- Name: idx_payroll_runs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_runs_status ON public.payroll_runs USING btree (status);


--
-- Name: idx_pings_agent_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pings_agent_time ON public.agent_location_pings USING btree (agent_id, recorded_at DESC);


--
-- Name: idx_pings_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pings_recorded ON public.agent_location_pings USING btree (recorded_at);


--
-- Name: idx_push_tokens_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_tokens_user ON public.device_push_tokens USING btree (user_id);


--
-- Name: idx_route_assignments_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_route_assignments_agent ON public.route_assignments USING btree (agent_id, status);


--
-- Name: idx_route_assignments_route; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_route_assignments_route ON public.route_assignments USING btree (route_id, valid_from);


--
-- Name: idx_salary_advances_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salary_advances_employee ON public.salary_advances USING btree (employee_id);


--
-- Name: idx_settlements_estate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlements_estate ON public.settlements USING btree (estate_id);


--
-- Name: idx_settlements_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlements_status ON public.settlements USING btree (status);


--
-- Name: idx_stock_movements_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_batch ON public.stock_movements USING btree (batch_id);


--
-- Name: idx_stock_movements_estate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_estate ON public.stock_movements USING btree (estate_id);


--
-- Name: uq_correction_one_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_correction_one_pending ON public.grade_correction_requests USING btree (delivery_id) WHERE ((status)::text = 'pending'::text);


--
-- Name: uq_notifications_dedupe; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_notifications_dedupe ON public.notifications USING btree (dedupe_key) WHERE (dedupe_key IS NOT NULL);


--
-- Name: uq_route_one_open_permanent; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_route_one_open_permanent ON public.route_assignments USING btree (route_id) WHERE (((type)::text = 'PERMANENT'::text) AND ((status)::text = 'ACTIVE'::text) AND (valid_to IS NULL));


--
-- Name: agent_day_status agent_day_status_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_day_status
    ADD CONSTRAINT agent_day_status_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.collection_agents(id);


--
-- Name: agent_location_pings agent_location_pings_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_location_pings
    ADD CONSTRAINT agent_location_pings_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.collection_agents(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: collection_agents collection_agents_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_agents
    ADD CONSTRAINT collection_agents_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.factory_employees(id);


--
-- Name: collection_agents collection_agents_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_agents
    ADD CONSTRAINT collection_agents_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: collection_agents collection_agents_hr_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_agents
    ADD CONSTRAINT collection_agents_hr_employee_id_fkey FOREIGN KEY (hr_employee_id) REFERENCES public.employees(id);


--
-- Name: complaints complaints_collection_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_collection_record_id_fkey FOREIGN KEY (collection_record_id) REFERENCES public.tea_collection_records(id);


--
-- Name: complaints complaints_fertilizer_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_fertilizer_request_id_fkey FOREIGN KEY (fertilizer_request_id) REFERENCES public.fertilizer_requests(id);


--
-- Name: complaints complaints_raised_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_raised_by_user_id_fkey FOREIGN KEY (raised_by_user_id) REFERENCES public.users(id);


--
-- Name: daily_plucking_records daily_plucking_records_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_plucking_records
    ADD CONSTRAINT daily_plucking_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.plucking_employees(id);


--
-- Name: daily_plucking_records daily_plucking_records_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_plucking_records
    ADD CONSTRAINT daily_plucking_records_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.tea_estate_managers(id);


--
-- Name: delivery_grade_lines delivery_grade_lines_delivery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_grade_lines
    ADD CONSTRAINT delivery_grade_lines_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES public.tea_collection_records(id) ON DELETE CASCADE;


--
-- Name: delivery_grade_revisions delivery_grade_revisions_delivery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_grade_revisions
    ADD CONSTRAINT delivery_grade_revisions_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES public.tea_collection_records(id) ON DELETE CASCADE;


--
-- Name: device_push_tokens device_push_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_push_tokens
    ADD CONSTRAINT device_push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: employee_attendance employee_attendance_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_attendance
    ADD CONSTRAINT employee_attendance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: employees employees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: estate_advances estate_advances_estate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estate_advances
    ADD CONSTRAINT estate_advances_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES public.estates(id);


--
-- Name: estate_documents estate_documents_estate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estate_documents
    ADD CONSTRAINT estate_documents_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES public.estates(id);


--
-- Name: estate_employees estate_employees_estate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estate_employees
    ADD CONSTRAINT estate_employees_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES public.estates(id);


--
-- Name: estate_employees estate_employees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estate_employees
    ADD CONSTRAINT estate_employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: estate_route_mapping estate_route_mapping_estate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estate_route_mapping
    ADD CONSTRAINT estate_route_mapping_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES public.estates(id);


--
-- Name: estate_route_mapping estate_route_mapping_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estate_route_mapping
    ADD CONSTRAINT estate_route_mapping_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: estate_route_mapping estate_route_mapping_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estate_route_mapping
    ADD CONSTRAINT estate_route_mapping_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- Name: estates estates_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estates
    ADD CONSTRAINT estates_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.tea_estate_owners(id);


--
-- Name: estates estates_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estates
    ADD CONSTRAINT estates_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- Name: factory_admins factory_admins_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factory_admins
    ADD CONSTRAINT factory_admins_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.factory_employees(id);


--
-- Name: factory_admins factory_admins_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factory_admins
    ADD CONSTRAINT factory_admins_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: factory_employees factory_employees_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factory_employees
    ADD CONSTRAINT factory_employees_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: factory_employees factory_employees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factory_employees
    ADD CONSTRAINT factory_employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: fertilizer_charges fertilizer_charges_estate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_charges
    ADD CONSTRAINT fertilizer_charges_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES public.estates(id);


--
-- Name: fertilizer_charges fertilizer_charges_fertilizer_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_charges
    ADD CONSTRAINT fertilizer_charges_fertilizer_request_id_fkey FOREIGN KEY (fertilizer_request_id) REFERENCES public.fertilizer_requests(id);


--
-- Name: fertilizer_charges fertilizer_charges_stock_movement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_charges
    ADD CONSTRAINT fertilizer_charges_stock_movement_id_fkey FOREIGN KEY (stock_movement_id) REFERENCES public.stock_movements(id);


--
-- Name: fertilizer_dispatches fertilizer_dispatches_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_dispatches
    ADD CONSTRAINT fertilizer_dispatches_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.collection_agents(id);


--
-- Name: fertilizer_dispatches fertilizer_dispatches_collection_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_dispatches
    ADD CONSTRAINT fertilizer_dispatches_collection_record_id_fkey FOREIGN KEY (collection_record_id) REFERENCES public.tea_collection_records(id);


--
-- Name: fertilizer_dispatches fertilizer_dispatches_fertilizer_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_dispatches
    ADD CONSTRAINT fertilizer_dispatches_fertilizer_request_id_fkey FOREIGN KEY (fertilizer_request_id) REFERENCES public.fertilizer_requests(id);


--
-- Name: fertilizer_requests fertilizer_requests_estate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_requests
    ADD CONSTRAINT fertilizer_requests_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES public.estates(id);


--
-- Name: fertilizer_requests fertilizer_requests_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_requests
    ADD CONSTRAINT fertilizer_requests_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: fertilizer_requests fertilizer_requests_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_requests
    ADD CONSTRAINT fertilizer_requests_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.tea_estate_owners(id);


--
-- Name: fertilizer_requests fertilizer_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fertilizer_requests
    ADD CONSTRAINT fertilizer_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.estate_employees(id);


--
-- Name: grade_correction_requests grade_correction_requests_delivery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_correction_requests
    ADD CONSTRAINT grade_correction_requests_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES public.tea_collection_records(id) ON DELETE CASCADE;


--
-- Name: grading_notifications grading_notifications_delivery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_notifications
    ADD CONSTRAINT grading_notifications_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES public.tea_collection_records(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: payroll_runs payroll_runs_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT payroll_runs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: plucking_completion_reports plucking_completion_reports_estate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plucking_completion_reports
    ADD CONSTRAINT plucking_completion_reports_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES public.estates(id);


--
-- Name: plucking_completion_reports plucking_completion_reports_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plucking_completion_reports
    ADD CONSTRAINT plucking_completion_reports_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.tea_estate_managers(id);


--
-- Name: plucking_employees plucking_employees_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plucking_employees
    ADD CONSTRAINT plucking_employees_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.estate_employees(id);


--
-- Name: receiving_officers receiving_officers_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receiving_officers
    ADD CONSTRAINT receiving_officers_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.factory_employees(id);


--
-- Name: receiving_officers receiving_officers_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receiving_officers
    ADD CONSTRAINT receiving_officers_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: route_assignments route_assignments_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_assignments
    ADD CONSTRAINT route_assignments_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.collection_agents(id);


--
-- Name: route_assignments route_assignments_covers_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_assignments
    ADD CONSTRAINT route_assignments_covers_assignment_id_fkey FOREIGN KEY (covers_assignment_id) REFERENCES public.route_assignments(id);


--
-- Name: route_assignments route_assignments_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_assignments
    ADD CONSTRAINT route_assignments_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- Name: route_neighbours route_neighbours_neighbour_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_neighbours
    ADD CONSTRAINT route_neighbours_neighbour_route_id_fkey FOREIGN KEY (neighbour_route_id) REFERENCES public.routes(id);


--
-- Name: route_neighbours route_neighbours_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_neighbours
    ADD CONSTRAINT route_neighbours_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- Name: routes routes_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: salary_advances salary_advances_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_advances
    ADD CONSTRAINT salary_advances_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: settlement_adjustments settlement_adjustments_applied_settlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_adjustments
    ADD CONSTRAINT settlement_adjustments_applied_settlement_id_fkey FOREIGN KEY (applied_settlement_id) REFERENCES public.settlements(id);


--
-- Name: settlement_adjustments settlement_adjustments_delivery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_adjustments
    ADD CONSTRAINT settlement_adjustments_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES public.tea_collection_records(id);


--
-- Name: settlement_adjustments settlement_adjustments_estate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_adjustments
    ADD CONSTRAINT settlement_adjustments_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES public.estates(id);


--
-- Name: settlement_adjustments settlement_adjustments_origin_settlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_adjustments
    ADD CONSTRAINT settlement_adjustments_origin_settlement_id_fkey FOREIGN KEY (origin_settlement_id) REFERENCES public.settlements(id);


--
-- Name: settlement_adjustments settlement_adjustments_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_adjustments
    ADD CONSTRAINT settlement_adjustments_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.grade_correction_requests(id);


--
-- Name: settlements settlements_estate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES public.estates(id);


--
-- Name: stock_movements stock_movements_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.fertilizer_batches(id);


--
-- Name: stock_movements stock_movements_estate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES public.estates(id);


--
-- Name: stock_movements stock_movements_linked_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_linked_request_id_fkey FOREIGN KEY (linked_request_id) REFERENCES public.fertilizer_requests(id);


--
-- Name: tea_collection_records tea_collection_records_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tea_collection_records
    ADD CONSTRAINT tea_collection_records_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.collection_agents(id);


--
-- Name: tea_collection_records tea_collection_records_estate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tea_collection_records
    ADD CONSTRAINT tea_collection_records_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES public.estates(id);


--
-- Name: tea_collection_records tea_collection_records_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tea_collection_records
    ADD CONSTRAINT tea_collection_records_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- Name: tea_collection_records tea_collection_records_settlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tea_collection_records
    ADD CONSTRAINT tea_collection_records_settlement_id_fkey FOREIGN KEY (settlement_id) REFERENCES public.settlements(id);


--
-- Name: tea_estate_managers tea_estate_managers_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tea_estate_managers
    ADD CONSTRAINT tea_estate_managers_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.estate_employees(id);


--
-- Name: tea_estate_managers tea_estate_managers_estate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tea_estate_managers
    ADD CONSTRAINT tea_estate_managers_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES public.estates(id);


--
-- Name: tea_estate_owners tea_estate_owners_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tea_estate_owners
    ADD CONSTRAINT tea_estate_owners_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--



--
-- PostgreSQL database dump
--

\restrict XDmtqKBdf6bLo8QY1sAcawzI8WOMnD5ZdIfRiGRpadAcFKLFFTbbSrVZhAyJoCT

-- Dumped from database version 18.6 (Postgres.app)
-- Dumped by pg_dump version 18.6 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: prevent_guidance_event_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_guidance_event_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'guidance_event table is append-only: UPDATE and DELETE operations are strictly prohibited.';
END;
$$;


ALTER FUNCTION public.prevent_guidance_event_mutation() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: analytics_summary; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.analytics_summary (
    metric_date date NOT NULL,
    total_sessions integer DEFAULT 0 NOT NULL,
    completed_sessions integer DEFAULT 0 NOT NULL,
    reference_found_count integer DEFAULT 0 NOT NULL,
    reference_not_found_count integer DEFAULT 0 NOT NULL,
    completion_rate_percent numeric(5,2) DEFAULT 0.00 NOT NULL,
    event_type_distribution jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_etl_run_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.analytics_summary OWNER TO postgres;

--
-- Name: data_quality_issue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_quality_issue (
    issue_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    entity_type character varying(64) NOT NULL,
    entity_id character varying(64) NOT NULL,
    issue_type character varying(64) NOT NULL,
    severity character varying(32) NOT NULL,
    description text NOT NULL,
    status character varying(32) DEFAULT 'DETECTED'::character varying NOT NULL,
    detected_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone
);


ALTER TABLE public.data_quality_issue OWNER TO postgres;

--
-- Name: guidance_event; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.guidance_event (
    event_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    session_id uuid NOT NULL,
    event_type character varying(64) NOT NULL,
    from_state character varying(64) NOT NULL,
    to_state character varying(64) NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_guidance_event_from_state CHECK (((from_state)::text = ANY ((ARRAY['INITIAL'::character varying, 'GUIDANCE_STARTED'::character varying, 'SERVICE_SEARCHED'::character varying, 'PUBLIC_REFERENCE_FOUND'::character varying, 'PUBLIC_REFERENCE_NOT_FOUND'::character varying, 'OFFICIAL_VERIFICATION_ROUTE_SHOWN'::character varying, 'SUPPORT_ROUTE_SHOWN'::character varying, 'GUIDANCE_COMPLETED'::character varying])::text[]))),
    CONSTRAINT chk_guidance_event_initial_only CHECK (((((from_state)::text = 'INITIAL'::text) AND ((event_type)::text = 'SESSION_INITIALIZED'::text) AND ((to_state)::text = 'GUIDANCE_STARTED'::text)) OR ((from_state)::text <> 'INITIAL'::text))),
    CONSTRAINT chk_guidance_event_to_state CHECK (((to_state)::text = ANY ((ARRAY['GUIDANCE_STARTED'::character varying, 'SERVICE_SEARCHED'::character varying, 'PUBLIC_REFERENCE_FOUND'::character varying, 'PUBLIC_REFERENCE_NOT_FOUND'::character varying, 'OFFICIAL_VERIFICATION_ROUTE_SHOWN'::character varying, 'SUPPORT_ROUTE_SHOWN'::character varying, 'GUIDANCE_COMPLETED'::character varying])::text[])))
);


ALTER TABLE public.guidance_event OWNER TO postgres;

--
-- Name: guidance_session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.guidance_session (
    session_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    current_state character varying(64) DEFAULT 'GUIDANCE_STARTED'::character varying NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    selected_category character varying(64),
    reference_found boolean,
    matched_package_id character varying(64),
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_guidance_session_state CHECK (((current_state)::text = ANY ((ARRAY['GUIDANCE_STARTED'::character varying, 'SERVICE_SEARCHED'::character varying, 'PUBLIC_REFERENCE_FOUND'::character varying, 'PUBLIC_REFERENCE_NOT_FOUND'::character varying, 'OFFICIAL_VERIFICATION_ROUTE_SHOWN'::character varying, 'SUPPORT_ROUTE_SHOWN'::character varying, 'GUIDANCE_COMPLETED'::character varying])::text[])))
);


ALTER TABLE public.guidance_session OWNER TO postgres;

--
-- Name: package_reference; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.package_reference (
    package_id character varying(64) NOT NULL,
    category_id character varying(64) NOT NULL,
    specialty_name character varying(128) NOT NULL,
    procedure_name character varying(255) NOT NULL,
    procedure_code character varying(64) NOT NULL,
    is_simulated_reference boolean DEFAULT true NOT NULL,
    data_status character varying(32) DEFAULT 'SYNTHETIC_DEMO'::character varying NOT NULL,
    simulation_notice text NOT NULL,
    official_verification_channel character varying(255) NOT NULL,
    help_desk_contact character varying(255) NOT NULL,
    seed_version character varying(32) NOT NULL,
    created_by character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    source_id character varying(64) NOT NULL,
    import_run_id uuid NOT NULL
);


ALTER TABLE public.package_reference OWNER TO postgres;

--
-- Name: source_document; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.source_document (
    source_id character varying(64) NOT NULL,
    source_name character varying(255) NOT NULL,
    source_type character varying(64) NOT NULL,
    publisher character varying(255) NOT NULL,
    publication_date date,
    source_url text,
    integrity_hash character varying(64) NOT NULL,
    is_authoritative boolean DEFAULT false NOT NULL,
    is_simulated boolean DEFAULT true NOT NULL,
    version_label character varying(64) DEFAULT 'demo-v0.1'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.source_document OWNER TO postgres;

--
-- Name: source_import_run; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.source_import_run (
    import_run_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    source_id character varying(64) NOT NULL,
    import_timestamp timestamp with time zone DEFAULT now(),
    records_imported integer DEFAULT 0 NOT NULL,
    import_status character varying(32) NOT NULL,
    validation_status character varying(32) NOT NULL,
    executed_by character varying(64) NOT NULL,
    log_summary text
);


ALTER TABLE public.source_import_run OWNER TO postgres;

--
-- Data for Name: analytics_summary; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.analytics_summary (metric_date, total_sessions, completed_sessions, reference_found_count, reference_not_found_count, completion_rate_percent, event_type_distribution, last_etl_run_at) FROM stdin;
2026-10-03	6	4	2	2	66.67	{"SERVICE_MATCH_FOUND": 2, "SESSION_INITIALIZED": 6, "SUPPORT_ROUTE_VIEWED": 2, "OFFICIAL_ROUTE_VIEWED": 2, "SERVICE_MATCH_NOT_FOUND": 2, "SERVICE_CATEGORY_SELECTED": 4, "GUIDANCE_ACKNOWLEDGED_AND_COMPLETED": 4}	2026-10-03 14:46:23.847847+05:30
\.


--
-- Data for Name: data_quality_issue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.data_quality_issue (issue_id, entity_type, entity_id, issue_type, severity, description, status, detected_at, resolved_at) FROM stdin;
\.


--
-- Data for Name: guidance_event; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.guidance_event (event_id, session_id, event_type, from_state, to_state, payload, created_at) FROM stdin;
aea6d2d8-49fc-40e9-9af3-755a6b7b74d9	445161a6-4a46-42f0-ba4c-587fae7a99c8	SESSION_INITIALIZED	INITIAL	GUIDANCE_STARTED	{"note": "Anonymous session initialized."}	2026-10-03 14:31:50.983659+05:30
28789660-2be3-4f03-8335-a1aaf26665c5	aa93e263-752e-4476-a61f-4c0ab89b820a	SESSION_INITIALIZED	INITIAL	GUIDANCE_STARTED	{"note": "Anonymous session initialized."}	2026-10-03 14:31:51.013468+05:30
658cacfc-e6d7-4b35-bbeb-2203abc1525f	445161a6-4a46-42f0-ba4c-587fae7a99c8	SERVICE_CATEGORY_SELECTED	GUIDANCE_STARTED	SERVICE_SEARCHED	{"category_id": "DEMO_ALPHA"}	2026-10-03 14:31:51.044049+05:30
1c453c90-8860-44d7-a02f-41335107adb4	445161a6-4a46-42f0-ba4c-587fae7a99c8	SERVICE_MATCH_FOUND	SERVICE_SEARCHED	PUBLIC_REFERENCE_FOUND	{"category_id": "DEMO_ALPHA", "reference_found": true, "matched_package_id": "DEMO-ALPHA-001"}	2026-10-03 14:31:51.044049+05:30
1dd402f4-32cf-44c5-b5cd-0cb04501dd80	445161a6-4a46-42f0-ba4c-587fae7a99c8	OFFICIAL_ROUTE_VIEWED	PUBLIC_REFERENCE_FOUND	OFFICIAL_VERIFICATION_ROUTE_SHOWN	{"route_type": "OFFICIAL_VERIFICATION"}	2026-10-03 14:31:51.062402+05:30
9a1d7e50-3c9e-4d7d-8f2c-256ca8035a24	445161a6-4a46-42f0-ba4c-587fae7a99c8	GUIDANCE_ACKNOWLEDGED_AND_COMPLETED	OFFICIAL_VERIFICATION_ROUTE_SHOWN	GUIDANCE_COMPLETED	{"acknowledged": true}	2026-10-03 14:31:51.084729+05:30
b9a8dfd1-4d28-435a-b0b7-7de0bf902f00	5357172e-c0cb-4005-91bc-defae72797b8	SESSION_INITIALIZED	INITIAL	GUIDANCE_STARTED	{"note": "Anonymous session initialized."}	2026-10-03 14:31:51.115105+05:30
78684b2b-bfc9-4320-9856-3f9af35ce0f5	5357172e-c0cb-4005-91bc-defae72797b8	SERVICE_CATEGORY_SELECTED	GUIDANCE_STARTED	SERVICE_SEARCHED	{"category_id": "NO_MATCH_DEMO"}	2026-10-03 14:31:51.128014+05:30
b324166c-34a2-41a1-a5aa-b62eb99f1c8e	5357172e-c0cb-4005-91bc-defae72797b8	SERVICE_MATCH_NOT_FOUND	SERVICE_SEARCHED	PUBLIC_REFERENCE_NOT_FOUND	{"category_id": "NO_MATCH_DEMO", "reference_found": false, "matched_package_id": null}	2026-10-03 14:31:51.128014+05:30
7a6d8808-8cd4-4807-9260-2491228ace4e	5357172e-c0cb-4005-91bc-defae72797b8	SUPPORT_ROUTE_VIEWED	PUBLIC_REFERENCE_NOT_FOUND	SUPPORT_ROUTE_SHOWN	{"route_type": "SUPPORT_ROUTE"}	2026-10-03 14:31:51.150369+05:30
8123be4c-d97b-462c-bab3-53e88033defb	5357172e-c0cb-4005-91bc-defae72797b8	GUIDANCE_ACKNOWLEDGED_AND_COMPLETED	SUPPORT_ROUTE_SHOWN	GUIDANCE_COMPLETED	{"acknowledged": true}	2026-10-03 14:31:51.16545+05:30
cb2f1eff-b0f5-4a8a-9468-9f7f111ada59	7bbf261e-f5c6-434b-96b5-7794d8b183b1	SESSION_INITIALIZED	INITIAL	GUIDANCE_STARTED	{"note": "Anonymous session initialized."}	2026-10-03 14:44:46.764458+05:30
3133f8a8-a112-4e2d-97a9-961ff7bc93b6	417beae4-940f-4919-a7bf-40cf3efd89f0	SESSION_INITIALIZED	INITIAL	GUIDANCE_STARTED	{"note": "Anonymous session initialized."}	2026-10-03 14:44:46.795583+05:30
00dc1c23-27d1-4f73-9448-80dfa37ed017	7bbf261e-f5c6-434b-96b5-7794d8b183b1	SERVICE_CATEGORY_SELECTED	GUIDANCE_STARTED	SERVICE_SEARCHED	{"category_id": "DEMO_ALPHA"}	2026-10-03 14:44:46.830608+05:30
73bc8732-223b-4593-9f30-fb3061f72ae0	7bbf261e-f5c6-434b-96b5-7794d8b183b1	SERVICE_MATCH_FOUND	SERVICE_SEARCHED	PUBLIC_REFERENCE_FOUND	{"category_id": "DEMO_ALPHA", "reference_found": true, "matched_package_id": "DEMO-ALPHA-001"}	2026-10-03 14:44:46.830608+05:30
a7b6cc8a-45a3-4f7a-b143-fa101d467e93	7bbf261e-f5c6-434b-96b5-7794d8b183b1	OFFICIAL_ROUTE_VIEWED	PUBLIC_REFERENCE_FOUND	OFFICIAL_VERIFICATION_ROUTE_SHOWN	{"route_type": "OFFICIAL_VERIFICATION"}	2026-10-03 14:44:46.85167+05:30
91fab2dd-397e-41a4-a218-3778ef3de5d6	7bbf261e-f5c6-434b-96b5-7794d8b183b1	GUIDANCE_ACKNOWLEDGED_AND_COMPLETED	OFFICIAL_VERIFICATION_ROUTE_SHOWN	GUIDANCE_COMPLETED	{"acknowledged": true}	2026-10-03 14:44:46.865978+05:30
66ccc063-697a-4970-b426-25d4d7734ca1	f4a6a85e-388e-45ee-b143-0e3e2b248def	SESSION_INITIALIZED	INITIAL	GUIDANCE_STARTED	{"note": "Anonymous session initialized."}	2026-10-03 14:44:46.976317+05:30
62daa3bb-f192-4239-ae03-b87803d45513	f4a6a85e-388e-45ee-b143-0e3e2b248def	SERVICE_CATEGORY_SELECTED	GUIDANCE_STARTED	SERVICE_SEARCHED	{"category_id": "NO_MATCH_DEMO"}	2026-10-03 14:44:46.993765+05:30
5d3c6d11-034b-4169-81f9-353947cdb825	f4a6a85e-388e-45ee-b143-0e3e2b248def	SERVICE_MATCH_NOT_FOUND	SERVICE_SEARCHED	PUBLIC_REFERENCE_NOT_FOUND	{"category_id": "NO_MATCH_DEMO", "reference_found": false, "matched_package_id": null}	2026-10-03 14:44:46.993765+05:30
223c77ff-1164-49a5-95a4-1f31cbcd66ab	f4a6a85e-388e-45ee-b143-0e3e2b248def	SUPPORT_ROUTE_VIEWED	PUBLIC_REFERENCE_NOT_FOUND	SUPPORT_ROUTE_SHOWN	{"route_type": "SUPPORT_ROUTE"}	2026-10-03 14:44:47.008829+05:30
4535205c-309d-4b43-a77d-08d558dcc05b	f4a6a85e-388e-45ee-b143-0e3e2b248def	GUIDANCE_ACKNOWLEDGED_AND_COMPLETED	SUPPORT_ROUTE_SHOWN	GUIDANCE_COMPLETED	{"acknowledged": true}	2026-10-03 14:44:47.022867+05:30
c94e28f8-7587-45ac-96ba-7d202878d400	ed910e59-c2a0-428e-a4ca-87bf6cad2972	SESSION_INITIALIZED	INITIAL	GUIDANCE_STARTED	{"note": "Anonymous session initialized."}	2026-10-03 14:49:24.857197+05:30
9c25a6e0-cfa5-4b1d-a48f-8ccf9579cc2a	56be7f66-ad9c-447f-bfc1-0d052b4f087f	SESSION_INITIALIZED	INITIAL	GUIDANCE_STARTED	{"note": "Anonymous session initialized."}	2026-10-03 14:49:24.886166+05:30
47475240-54a2-43df-9431-226f1865b416	ed910e59-c2a0-428e-a4ca-87bf6cad2972	SERVICE_CATEGORY_SELECTED	GUIDANCE_STARTED	SERVICE_SEARCHED	{"category_id": "DEMO_ALPHA"}	2026-10-03 14:49:24.919384+05:30
29fd4037-aa0a-407e-9a61-88b67930b347	ed910e59-c2a0-428e-a4ca-87bf6cad2972	SERVICE_MATCH_FOUND	SERVICE_SEARCHED	PUBLIC_REFERENCE_FOUND	{"category_id": "DEMO_ALPHA", "reference_found": true, "matched_package_id": "DEMO-ALPHA-001"}	2026-10-03 14:49:24.919384+05:30
47782a72-3066-4c18-ae17-21278a14a25d	ed910e59-c2a0-428e-a4ca-87bf6cad2972	OFFICIAL_ROUTE_VIEWED	PUBLIC_REFERENCE_FOUND	OFFICIAL_VERIFICATION_ROUTE_SHOWN	{"route_type": "OFFICIAL_VERIFICATION"}	2026-10-03 14:49:24.937964+05:30
c9a5a434-7777-47e6-8788-28fe81365fd5	ed910e59-c2a0-428e-a4ca-87bf6cad2972	GUIDANCE_ACKNOWLEDGED_AND_COMPLETED	OFFICIAL_VERIFICATION_ROUTE_SHOWN	GUIDANCE_COMPLETED	{"acknowledged": true}	2026-10-03 14:49:24.957288+05:30
659d6f48-2414-4249-b233-fb79032ff32a	ecda7849-898c-4ef2-b97c-b3d2d9a5365b	SESSION_INITIALIZED	INITIAL	GUIDANCE_STARTED	{"note": "Anonymous session initialized."}	2026-10-03 14:49:25.059266+05:30
4ce7a754-fda8-43b3-abfc-7bad30d2beef	ecda7849-898c-4ef2-b97c-b3d2d9a5365b	SERVICE_CATEGORY_SELECTED	GUIDANCE_STARTED	SERVICE_SEARCHED	{"category_id": "NO_MATCH_DEMO"}	2026-10-03 14:49:25.073574+05:30
6e238ce8-a1eb-4365-9d02-85073be052cc	ecda7849-898c-4ef2-b97c-b3d2d9a5365b	SERVICE_MATCH_NOT_FOUND	SERVICE_SEARCHED	PUBLIC_REFERENCE_NOT_FOUND	{"category_id": "NO_MATCH_DEMO", "reference_found": false, "matched_package_id": null}	2026-10-03 14:49:25.073574+05:30
8c9baa8e-94cc-49ff-9fe0-83e83158b9d4	ecda7849-898c-4ef2-b97c-b3d2d9a5365b	SUPPORT_ROUTE_VIEWED	PUBLIC_REFERENCE_NOT_FOUND	SUPPORT_ROUTE_SHOWN	{"route_type": "SUPPORT_ROUTE"}	2026-10-03 14:49:25.087014+05:30
085dcccd-f37c-4d79-a2c4-95eaa05528a1	ecda7849-898c-4ef2-b97c-b3d2d9a5365b	GUIDANCE_ACKNOWLEDGED_AND_COMPLETED	SUPPORT_ROUTE_SHOWN	GUIDANCE_COMPLETED	{"acknowledged": true}	2026-10-03 14:49:25.099915+05:30
88b669fa-74be-4d9c-abcf-d0c51b31d29b	9952ad35-9086-4d8f-93e5-16cbc394acae	SESSION_INITIALIZED	INITIAL	GUIDANCE_STARTED	{"note": "Anonymous session initialized."}	2026-10-03 14:50:07.544554+05:30
062ad8c8-429d-47e3-bd03-de7456771de3	a6ea1a93-acc7-4354-bf15-4ebfea3c3440	SESSION_INITIALIZED	INITIAL	GUIDANCE_STARTED	{"note": "Anonymous session initialized."}	2026-10-03 14:50:07.57024+05:30
115144cf-f22b-4a9c-a3b7-1907690b57e3	9952ad35-9086-4d8f-93e5-16cbc394acae	SERVICE_CATEGORY_SELECTED	GUIDANCE_STARTED	SERVICE_SEARCHED	{"category_id": "DEMO_ALPHA"}	2026-10-03 14:50:07.603154+05:30
bc759f2d-b056-446f-b6c7-80c6205667c3	9952ad35-9086-4d8f-93e5-16cbc394acae	SERVICE_MATCH_FOUND	SERVICE_SEARCHED	PUBLIC_REFERENCE_FOUND	{"category_id": "DEMO_ALPHA", "reference_found": true, "matched_package_id": "DEMO-ALPHA-001"}	2026-10-03 14:50:07.603154+05:30
a10ba248-79e5-439b-b601-c21f6f2c0599	9952ad35-9086-4d8f-93e5-16cbc394acae	OFFICIAL_ROUTE_VIEWED	PUBLIC_REFERENCE_FOUND	OFFICIAL_VERIFICATION_ROUTE_SHOWN	{"route_type": "OFFICIAL_VERIFICATION"}	2026-10-03 14:50:07.623543+05:30
a6410492-fb7f-4830-a8bf-0ff188f5307c	9952ad35-9086-4d8f-93e5-16cbc394acae	GUIDANCE_ACKNOWLEDGED_AND_COMPLETED	OFFICIAL_VERIFICATION_ROUTE_SHOWN	GUIDANCE_COMPLETED	{"acknowledged": true}	2026-10-03 14:50:07.640306+05:30
af62440c-0f6c-437a-8182-a783f79c0bcd	1251d276-6a48-4b0c-b4ff-c153dd5a79d8	SESSION_INITIALIZED	INITIAL	GUIDANCE_STARTED	{"note": "Anonymous session initialized."}	2026-10-03 14:50:07.743144+05:30
eb14937e-673e-416d-9c28-5d7d11d9952d	1251d276-6a48-4b0c-b4ff-c153dd5a79d8	SERVICE_CATEGORY_SELECTED	GUIDANCE_STARTED	SERVICE_SEARCHED	{"category_id": "NO_MATCH_DEMO"}	2026-10-03 14:50:07.753374+05:30
1ec21cfb-9afa-4fcd-bb4c-299cbfba45c9	1251d276-6a48-4b0c-b4ff-c153dd5a79d8	SERVICE_MATCH_NOT_FOUND	SERVICE_SEARCHED	PUBLIC_REFERENCE_NOT_FOUND	{"category_id": "NO_MATCH_DEMO", "reference_found": false, "matched_package_id": null}	2026-10-03 14:50:07.753374+05:30
524c72fc-87a8-4eb3-80e6-f8b067f7b5e2	1251d276-6a48-4b0c-b4ff-c153dd5a79d8	SUPPORT_ROUTE_VIEWED	PUBLIC_REFERENCE_NOT_FOUND	SUPPORT_ROUTE_SHOWN	{"route_type": "SUPPORT_ROUTE"}	2026-10-03 14:50:07.76624+05:30
f9c30505-7370-4a7c-a016-40dee7e91062	1251d276-6a48-4b0c-b4ff-c153dd5a79d8	GUIDANCE_ACKNOWLEDGED_AND_COMPLETED	SUPPORT_ROUTE_SHOWN	GUIDANCE_COMPLETED	{"acknowledged": true}	2026-10-03 14:50:07.782269+05:30
\.


--
-- Data for Name: guidance_session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.guidance_session (session_id, current_state, is_completed, selected_category, reference_found, matched_package_id, started_at, completed_at, updated_at) FROM stdin;
aa93e263-752e-4476-a61f-4c0ab89b820a	GUIDANCE_STARTED	f	\N	\N	\N	2026-10-03 14:31:51.013468+05:30	\N	2026-10-03 14:31:51.013468+05:30
445161a6-4a46-42f0-ba4c-587fae7a99c8	GUIDANCE_COMPLETED	t	DEMO_ALPHA	t	DEMO-ALPHA-001	2026-10-03 14:31:50.983659+05:30	2026-10-03 14:31:51.084729+05:30	2026-10-03 14:31:51.084729+05:30
5357172e-c0cb-4005-91bc-defae72797b8	GUIDANCE_COMPLETED	t	NO_MATCH_DEMO	f	\N	2026-10-03 14:31:51.115105+05:30	2026-10-03 14:31:51.16545+05:30	2026-10-03 14:31:51.16545+05:30
417beae4-940f-4919-a7bf-40cf3efd89f0	GUIDANCE_STARTED	f	\N	\N	\N	2026-10-03 14:44:46.795583+05:30	\N	2026-10-03 14:44:46.795583+05:30
7bbf261e-f5c6-434b-96b5-7794d8b183b1	GUIDANCE_COMPLETED	t	DEMO_ALPHA	t	DEMO-ALPHA-001	2026-10-03 14:44:46.764458+05:30	2026-10-03 14:44:46.865978+05:30	2026-10-03 14:44:46.865978+05:30
f4a6a85e-388e-45ee-b143-0e3e2b248def	GUIDANCE_COMPLETED	t	NO_MATCH_DEMO	f	\N	2026-10-03 14:44:46.976317+05:30	2026-10-03 14:44:47.022867+05:30	2026-10-03 14:44:47.022867+05:30
56be7f66-ad9c-447f-bfc1-0d052b4f087f	GUIDANCE_STARTED	f	\N	\N	\N	2026-10-03 14:49:24.886166+05:30	\N	2026-10-03 14:49:24.886166+05:30
ed910e59-c2a0-428e-a4ca-87bf6cad2972	GUIDANCE_COMPLETED	t	DEMO_ALPHA	t	DEMO-ALPHA-001	2026-10-03 14:49:24.857197+05:30	2026-10-03 14:49:24.957288+05:30	2026-10-03 14:49:24.957288+05:30
ecda7849-898c-4ef2-b97c-b3d2d9a5365b	GUIDANCE_COMPLETED	t	NO_MATCH_DEMO	f	\N	2026-10-03 14:49:25.059266+05:30	2026-10-03 14:49:25.099915+05:30	2026-10-03 14:49:25.099915+05:30
a6ea1a93-acc7-4354-bf15-4ebfea3c3440	GUIDANCE_STARTED	f	\N	\N	\N	2026-10-03 14:50:07.57024+05:30	\N	2026-10-03 14:50:07.57024+05:30
9952ad35-9086-4d8f-93e5-16cbc394acae	GUIDANCE_COMPLETED	t	DEMO_ALPHA	t	DEMO-ALPHA-001	2026-10-03 14:50:07.544554+05:30	2026-10-03 14:50:07.640306+05:30	2026-10-03 14:50:07.640306+05:30
1251d276-6a48-4b0c-b4ff-c153dd5a79d8	GUIDANCE_COMPLETED	t	NO_MATCH_DEMO	f	\N	2026-10-03 14:50:07.743144+05:30	2026-10-03 14:50:07.782269+05:30	2026-10-03 14:50:07.782269+05:30
\.


--
-- Data for Name: package_reference; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.package_reference (package_id, category_id, specialty_name, procedure_name, procedure_code, is_simulated_reference, data_status, simulation_notice, official_verification_channel, help_desk_contact, seed_version, created_by, created_at, source_id, import_run_id) FROM stdin;
DEMO-ALPHA-001	DEMO_ALPHA	Simulated Domain Alpha	Simulated Service Item Alpha [Synthetic Demo]	CODE-DEMO-ALPHA	t	SYNTHETIC_DEMO	DEMONSTRATION RECORD ONLY: This record is entirely simulated for 2nd-year academic evaluation. It does not represent an actual healthcare package, real government scheme, or medical rate.	Authorized Hospital Help Desk / Official State Health Channel	Relevant Official Scheme Channel / Authorized Hospital Support Desk	demo-v0.1	student_engineering_team	2026-10-03 14:28:12.028857+05:30	SYNTH-SRC-2026-V1	00000000-0000-0000-0000-000000000001
DEMO-BETA-002	DEMO_BETA	Simulated Domain Beta	Simulated Service Item Beta [Synthetic Demo]	CODE-DEMO-BETA	t	SYNTHETIC_DEMO	DEMONSTRATION RECORD ONLY: This record is entirely simulated for 2nd-year academic evaluation. It does not represent an actual healthcare package, real government scheme, or medical rate.	Authorized Hospital Help Desk / Official State Health Channel	Relevant Official Scheme Channel / Authorized Hospital Support Desk	demo-v0.1	student_engineering_team	2026-10-03 14:28:12.028857+05:30	SYNTH-SRC-2026-V1	00000000-0000-0000-0000-000000000001
DEMO-GAMMA-003	DEMO_GAMMA	Simulated Domain Gamma	Simulated Service Item Gamma [Synthetic Demo]	CODE-DEMO-GAMMA	t	SYNTHETIC_DEMO	DEMONSTRATION RECORD ONLY: This record is entirely simulated for 2nd-year academic evaluation. It does not represent an actual healthcare package, real government scheme, or medical rate.	Authorized Hospital Help Desk / Official State Health Channel	Relevant Official Scheme Channel / Authorized Hospital Support Desk	demo-v0.1	student_engineering_team	2026-10-03 14:28:12.028857+05:30	SYNTH-SRC-2026-V1	00000000-0000-0000-0000-000000000001
\.


--
-- Data for Name: source_document; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.source_document (source_id, source_name, source_type, publisher, publication_date, source_url, integrity_hash, is_authoritative, is_simulated, version_label, notes, created_at) FROM stdin;
SYNTH-SRC-2026-V1	Capstone Synthetic Demonstration Reference Dataset	SYNTHETIC_SPECIFICATION	Capstone Student Engineering Team	\N	\N	9cb17fdb8be796952d7c0283fd0bebac7f96e507dc7842fe2e228308f3e26b00	f	t	demo-v0.1	Student-team-reviewed synthetic demonstration reference records for 2nd-year academic prototype testing. Strictly non-clinical, non-governmental, and non-authoritative.	2026-10-03 14:27:56.49533+05:30
\.


--
-- Data for Name: source_import_run; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.source_import_run (import_run_id, source_id, import_timestamp, records_imported, import_status, validation_status, executed_by, log_summary) FROM stdin;
bcb070a8-755a-43db-994f-c29eda3b809b	SYNTH-SRC-2026-V1	2026-10-03 14:27:56.496878+05:30	3	SUCCESS	STUDENT_TEAM_REVIEWED_SYNTHETIC	SYSTEM_SEED_MIGRATION	Imported 3 controlled student-team-reviewed synthetic test records for category matching demonstration.
239c9572-7dec-4999-9b7f-f097e6499bee	SYNTH-SRC-2026-V1	2026-10-03 14:28:12.027507+05:30	3	SUCCESS	STUDENT_TEAM_REVIEWED_SYNTHETIC	SYSTEM_SEED_MIGRATION	Imported 3 controlled student-team-reviewed synthetic test records for category matching demonstration.
00000000-0000-0000-0000-000000000001	SYNTH-SRC-2026-V1	2026-10-03 14:40:23.921578+05:30	3	SUCCESS	STUDENT_TEAM_REVIEWED_SYNTHETIC	SYSTEM_SEED_MIGRATION	Imported 3 controlled student-team-reviewed synthetic test records for category matching demonstration.
\.


--
-- Name: analytics_summary analytics_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics_summary
    ADD CONSTRAINT analytics_summary_pkey PRIMARY KEY (metric_date);


--
-- Name: data_quality_issue data_quality_issue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_quality_issue
    ADD CONSTRAINT data_quality_issue_pkey PRIMARY KEY (issue_id);


--
-- Name: guidance_event guidance_event_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guidance_event
    ADD CONSTRAINT guidance_event_pkey PRIMARY KEY (event_id);


--
-- Name: guidance_session guidance_session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guidance_session
    ADD CONSTRAINT guidance_session_pkey PRIMARY KEY (session_id);


--
-- Name: package_reference package_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_reference
    ADD CONSTRAINT package_reference_pkey PRIMARY KEY (package_id);


--
-- Name: source_document source_document_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.source_document
    ADD CONSTRAINT source_document_pkey PRIMARY KEY (source_id);


--
-- Name: source_import_run source_import_run_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.source_import_run
    ADD CONSTRAINT source_import_run_pkey PRIMARY KEY (import_run_id);


--
-- Name: idx_event_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_created_at ON public.guidance_event USING btree (created_at);


--
-- Name: idx_event_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_session ON public.guidance_event USING btree (session_id);


--
-- Name: idx_event_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_type ON public.guidance_event USING btree (event_type);


--
-- Name: idx_pkg_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pkg_category ON public.package_reference USING btree (category_id);


--
-- Name: idx_session_completed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_session_completed ON public.guidance_session USING btree (is_completed);


--
-- Name: idx_session_state; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_session_state ON public.guidance_session USING btree (current_state);


--
-- Name: guidance_event trg_prevent_guidance_event_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_guidance_event_mutation BEFORE DELETE OR UPDATE ON public.guidance_event FOR EACH ROW EXECUTE FUNCTION public.prevent_guidance_event_mutation();


--
-- Name: guidance_event guidance_event_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guidance_event
    ADD CONSTRAINT guidance_event_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.guidance_session(session_id) ON DELETE RESTRICT;


--
-- Name: guidance_session guidance_session_matched_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guidance_session
    ADD CONSTRAINT guidance_session_matched_package_id_fkey FOREIGN KEY (matched_package_id) REFERENCES public.package_reference(package_id);


--
-- Name: package_reference package_reference_import_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_reference
    ADD CONSTRAINT package_reference_import_run_id_fkey FOREIGN KEY (import_run_id) REFERENCES public.source_import_run(import_run_id);


--
-- Name: package_reference package_reference_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_reference
    ADD CONSTRAINT package_reference_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source_document(source_id);


--
-- Name: source_import_run source_import_run_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.source_import_run
    ADD CONSTRAINT source_import_run_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source_document(source_id);


--
-- PostgreSQL database dump complete
--

\unrestrict XDmtqKBdf6bLo8QY1sAcawzI8WOMnD5ZdIfRiGRpadAcFKLFFTbbSrVZhAyJoCT


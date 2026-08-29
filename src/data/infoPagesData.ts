export interface InfoPageDoc {
  id: string;
  title: string;
  category: 'legal' | 'trust' | 'support' | 'company';
  categoryLabel: string;
  lastUpdated: string;
  summary: string;
  badge?: string;
  sections: {
    heading: string;
    content: string | string[];
    subpoints?: string[];
  }[];
}

export const INFO_PAGE_CATEGORIES = [
  { id: 'legal', label: 'Legal & Policies', icon: 'Scale' },
  { id: 'trust', label: 'Trust & Safety', icon: 'ShieldCheck' },
  { id: 'support', label: 'Support & Help', icon: 'HelpCircle' },
  { id: 'company', label: 'Company & Press', icon: 'Building2' },
] as const;

export const INFO_PAGES_DATA: Record<string, InfoPageDoc> = {
  // ==========================================
  // LEGAL & POLICIES
  // ==========================================
  'terms-and-conditions': {
    id: 'terms-and-conditions',
    title: 'Terms & Conditions',
    category: 'legal',
    categoryLabel: 'Legal',
    lastUpdated: 'August 2026',
    summary: 'The primary legal agreement governing your access to and use of Dormiqa platform services.',
    badge: 'Core Legal Agreement',
    sections: [
      {
        heading: '1. Introduction & Acceptance of Terms',
        content: [
          'Welcome to Dormiqa ("Platform", "We", "Us", or "Our"), operated by [Dormiqa Technologies Limited - RC XXXXXXX], headquartered at [Plot 12 Campus Way, Yaba, Lagos State, Nigeria]. By accessing our website, mobile interface, or associated software applications, you ("User", "Student", or "Agent") agree to be bound by these Terms & Conditions and all referenced operational policies.',
          'If you do not agree to these Terms in full, you must immediately discontinue use of the Platform. Continued use constitutes explicit assent to these Terms.'
        ]
      },
      {
        heading: '2. Platform Intermediary & Technology Status',
        content: [
          'CRITICAL NOTICE: Dormiqa operates strictly as an online technology intermediary and venue platform. Dormiqa does NOT own, manage, lease, inspect as a property manager, or hold legal title to any real estate or student accommodation listed on the Platform.',
          'Dormiqa does NOT process, collect, hold, or escrow tenancy payments, security deposits, caution fees, or agent commissions. All tenancy negotiations, lease agreements, property inspections, and monetary transactions occur directly between the Student and the verified Agent or landlord.'
        ]
      },
      {
        heading: '3. User Eligibility & Account Creation',
        content: [
          'To register an account on Dormiqa, you must be at least 18 years of age or possess legal capacity under [Laws of the Federal Republic of Nigeria] or the applicable jurisdiction of your university.',
          'You are responsible for maintaining the strict confidentiality of your account credentials. Any activities originating from your account are legally attributable to you.'
        ],
        subpoints: [
          'Provide accurate, verifiable personal details including legal name, official email, and phone number.',
          'Do not impersonate any person, tertiary institution staff member, or registered corporate entity.',
          'Notify [dormiqa.ng@gmail.com] immediately upon suspecting unauthorized account access.'
        ]
      },
      {
        heading: '4. Prohibited Platform Activities',
        content: 'Users are strictly prohibited from engaging in any conduct that compromises platform safety, data integrity, or user security.',
        subpoints: [
          'Posting deceptive, duplicate, or non-existent property listings.',
          'Requesting advance inspection fees or digital rent payments before in-person physical inspections.',
          'Scraping, automated data crawling, or reverse-engineering platform algorithms.',
          'Harassing, discriminating against, or threatening students or agents based on ethnicity, religion, state of origin, or gender.'
        ]
      },
      {
        heading: '5. Disclaimers & Limitation of Liability',
        content: [
          'The Platform is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, whether express or implied.',
          'To the maximum extent permitted under applicable law, Dormiqa, its directors, employees, and software engineers shall not be liable for any direct, indirect, incidental, or consequential damages resulting from off-platform agreements, property defects, tenancy disputes, financial loss from unverified wire transfers, or physical injury during off-campus house inspections.'
        ]
      },
      {
        heading: '6. Account Termination & Suspension',
        content: 'Dormiqa reserves the absolute right to suspend or permanently deactivate any account found to violate our Verification Policy, Anti-Fraud Policy, or Community Guidelines without prior formal notice.'
      },
      {
        heading: '7. Governing Law & Dispute Resolution',
        content: 'These Terms shall be governed by and construed in accordance with the [Laws of the Federal Republic of Nigeria]. Any dispute arising out of or in connection with these Terms shall first be submitted to good-faith mediation managed by the [Lagos Multi-Door Courthouse / Relevant ADR Body] prior to court litigation.'
      },
      {
        heading: '8. Corporate Contact Information',
        content: 'For legal queries or formal notices, write to [dormiqa.ng@gmail.com] or send physical mail to [Dormiqa Technologies Limited, Plot 12 Campus Way, Yaba, Lagos, Nigeria].'
      }
    ]
  },

  'privacy-policy': {
    id: 'privacy-policy',
    title: 'Privacy Policy',
    category: 'legal',
    categoryLabel: 'Legal',
    lastUpdated: 'August 2026',
    summary: 'How Dormiqa collects, encrypts, uses, and safeguards personal data under Nigerian and African data protection regulations.',
    badge: 'Data Protection & Compliance',
    sections: [
      {
        heading: '1. Compliance Framework',
        content: 'Dormiqa operates in compliance with the Nigeria Data Protection Act (NDPA), the Nigeria Data Protection Regulation (NDPR), and applicable African regional data protection legislation. We respect user privacy and are committed to maintaining data security.'
      },
      {
        heading: '2. Information We Collect',
        content: 'We collect personal information necessary to deliver verified student accommodation matching services:',
        subpoints: [
          'Account Identity: Name, phone number, email address, student matriculation details, or Agent identity documents (NIN, CAC registration).',
          'Search & Location Data: Preferred university campus, walking distance radius preferences, budget limits.',
          'Technical Logs: IP address, device telemetry, browser type, and cookie identifiers for fraud prevention.'
        ]
      },
      {
        heading: '3. How We Use Your Information',
        content: 'Your data is strictly used to fulfill platform operations:',
        subpoints: [
          'Verify student and property agent identity credentials.',
          'Facilitate secure messaging and inspection bookings between students and caretakers.',
          'Detect and prevent fraudulent listing attempts and unauthorized scraping.',
          'Send critical updates regarding listing approvals or security alerts.'
        ]
      },
      {
        heading: '4. Data Protection & Encryption',
        content: 'All data transmitted between your browser/app and Dormiqa servers is encrypted using industry-standard TLS 1.3 encryption. Stored databases utilize AES-256 at-rest encryption behind secure firewalls.'
      },
      {
        heading: '5. Sharing & Third-Party Processors',
        content: 'We do NOT sell, rent, or trade your personal data to third-party advertisers. Limited data may be processed by cloud infrastructure partners strictly required to operate the Platform.'
      },
      {
        heading: '6. Your Rights',
        content: 'You have the right to request access to, correction of, or permanent deletion of your personal data stored on Dormiqa. Email [dormiqa.ng@gmail.com] to exercise your rights.'
      }
    ]
  },

  'cookie-policy': {
    id: 'cookie-policy',
    title: 'Cookie Policy',
    category: 'legal',
    categoryLabel: 'Legal',
    lastUpdated: 'August 2026',
    summary: 'Detailed overview of technical cookies, local storage session keys, and how you can control your tracking preferences.',
    sections: [
      {
        heading: '1. What Are Cookies?',
        content: 'Cookies and local browser storage are small text files placed on your device to ensure seamless navigation, preserve search filter states, and protect account authentication sessions.'
      },
      {
        heading: '2. Types of Cookies We Use',
        content: [
          'Essential Session Cookies: Required for core authentication, security tokens, and account switching.',
          'Functional Preference Cookies: Stores your selected university campus, budget range, and dark/light display preferences.',
          'Security & Anti-Fraud Tokens: Used to prevent cross-site request forgery (CSRF) and bot attacks.'
        ]
      },
      {
        heading: '3. Controlling Cookies',
        content: 'You can modify your browser settings to refuse non-essential cookies. However, disabling essential technical cookies may prevent you from logging in or saving listing inspection appointments.'
      }
    ]
  },

  'acceptable-use-policy': {
    id: 'acceptable-use-policy',
    title: 'Acceptable Use Policy',
    category: 'legal',
    categoryLabel: 'Legal',
    lastUpdated: 'August 2026',
    summary: 'Enforceable standards governing allowable content, platform security, and user interactions on Dormiqa.',
    sections: [
      {
        heading: '1. Purpose of Policy',
        content: 'This Acceptable Use Policy specifies prohibited uses of Dormiqa to maintain a safe, trusted, and respectful environment for tertiary institution students and property caretakers.'
      },
      {
        heading: '2. Strictly Prohibited Conduct',
        content: 'Users must not under any circumstances:',
        subpoints: [
          'Post false, misleading, or ghost property listings.',
          'Upload photos containing unauthorized personal images, watermarks of competitor platforms, or offensive material.',
          'Solicit off-platform payment fees before physical inspection.',
          'Use automated bots, crawlers, or scrapers to extract listing data.',
          'Send spam, unsolicited marketing messages, or abusive communications to other users.'
        ]
      },
      {
        heading: '3. Enforcement & Penalties',
        content: 'Violations result in immediate listing removal, temporary suspension, or permanent account termination, alongside potential referral to law enforcement agencies for advance-fee fraud.'
      }
    ]
  },

  'agent-terms': {
    id: 'agent-terms',
    title: 'Agent Terms & Conditions',
    category: 'legal',
    categoryLabel: 'Legal',
    lastUpdated: 'August 2026',
    summary: 'Binding terms for verified property agents, landlords, caretakers, and property managers operating on Dormiqa.',
    badge: 'Property Host Agreement',
    sections: [
      {
        heading: '1. Scope of Agent Agreement',
        content: 'These Agent Terms apply to all individuals or business entities registering as property hosts, estate agents, caretakers, or landlords on Dormiqa.'
      },
      {
        heading: '2. Mandatory Identity & Business Verification',
        content: 'All agents must complete identity verification by submitting a valid Government Identity Document (NIN, Driver’s License, or International Passport) and CAC (Corporate Affairs Commission) business registration details where applicable.'
      },
      {
        heading: '3. Listing Authenticity & Accuracy',
        content: 'Agents warrant that:',
        subpoints: [
          'They possess legal authority or power of attorney from the property owner to list the student accommodation.',
          'Listing prices (annual rent, caution deposit, service charge) are accurate, up-to-date, and free of hidden fees.',
          'Photos accurately depict the actual current state of the apartment or hostel room.',
          'Walking distance metrics to university gates are truthful and non-misleading.'
        ]
      },
      {
        heading: '4. Physical Inspection Guarantee',
        content: 'Agents must accommodate scheduled physical student inspections without charging non-refundable upfront "form fees" or "commitment fees" prior to viewing.'
      },
      {
        heading: '5. Zero Extortion & Fraud Prohibition',
        content: 'Dormiqa maintains a strict zero-tolerance policy against advance extortion, double-allocation of rooms, or fake deposit demands. Offending agents face immediate banishment and legal escalation.'
      }
    ]
  },

  'student-terms': {
    id: 'student-terms',
    title: 'Student Terms of Use',
    category: 'legal',
    categoryLabel: 'Legal',
    lastUpdated: 'August 2026',
    summary: 'Guidelines, safety responsibilities, and rights for students searching for off-campus accommodation.',
    sections: [
      {
        heading: '1. Student Account Guidelines',
        content: 'Students agree to use Dormiqa solely for legitimate off-campus student accommodation discovery and verified inspection scheduling.'
      },
      {
        heading: '2. Inspection Safety & Due Diligence',
        content: 'Students are strongly advised to adhere to basic safety guidelines during physical inspections:',
        subpoints: [
          'Always conduct property viewings during daytime hours.',
          'Whenever possible, attend physical viewings with a friend, fellow student, or guardian.',
          'NEVER transfer money, rent deposits, or caution fees before physically inspecting the lodge and verifying key possession.',
          'Verify that the caretaker has actual key access and legitimate rights to rent the premises.'
        ]
      },
      {
        heading: '3. Direct Contract Disclaimer',
        content: 'Students acknowledge that tenancy agreements are directly executed between the student and the property owner/agent. Dormiqa is not a party to lease contracts and holds no liability for rent refunds or landlord-tenant disputes.'
      }
    ]
  },

  'disclaimer': {
    id: 'disclaimer',
    title: 'General Disclaimer',
    category: 'legal',
    categoryLabel: 'Legal',
    lastUpdated: 'August 2026',
    summary: 'Formal notice detailing technology intermediary limits, non-party status, and liability boundaries.',
    sections: [
      {
        heading: '1. Intermediary Status Notice',
        content: 'Dormiqa is an independent digital marketplace platform connecting students with third-party verified property hosts. Dormiqa is NOT a real estate broker, landlord, property manager, or financial custodian.'
      },
      {
        heading: '2. No Direct Guarantee of Accommodation',
        content: 'While Dormiqa enforces rigorous verification standards, we do not guarantee the structural condition, physical security, electrical supply stability, or water availability of listed properties.'
      },
      {
        heading: '3. Financial Payment Warning',
        content: 'Dormiqa explicitly warns all users NEVER to pay cash or electronic bank transfers to individuals claiming to represent Dormiqa for rent holding or deposit guarantees. Dormiqa staff will NEVER ask you to wire money for accommodation.'
      }
    ]
  },

  'intellectual-property-policy': {
    id: 'intellectual-property-policy',
    title: 'Intellectual Property Policy',
    category: 'legal',
    categoryLabel: 'Legal',
    lastUpdated: 'August 2026',
    summary: 'Protection of Dormiqa brand marks, software design, matching algorithms, and user media content.',
    sections: [
      {
        heading: '1. Ownership of Brand & Assets',
        content: 'All trademarks, logos, brand names, web graphics, source code, UI designs, database architectures, and algorithms on Dormiqa are the exclusive intellectual property of [Dormiqa Technologies Limited].'
      },
      {
        heading: '2. User Content License',
        content: 'By uploading property photographs, descriptions, or reviews to Dormiqa, agents and students grant Dormiqa a non-exclusive, worldwide, royalty-free license to display, optimize, and distribute the media solely for platform operational and promotional purposes.'
      }
    ]
  },

  'copyright-policy': {
    id: 'copyright-policy',
    title: 'Copyright Policy & Takedown Procedure',
    category: 'legal',
    categoryLabel: 'Legal',
    lastUpdated: 'August 2026',
    summary: 'Process for reporting unauthorized use of copyrighted photographs, property descriptions, or media.',
    sections: [
      {
        heading: '1. Copyright Notice',
        content: 'Dormiqa respects intellectual property rights and expects users to do the same. If you believe your copyrighted photographs or listing content have been posted on Dormiqa without permission, follow our takedown procedure.'
      },
      {
        heading: '2. Takedown Request Notice',
        content: 'Send a written copyright complaint to [dormiqa.ng@gmail.com] including:',
        subpoints: [
          'Identification of the copyrighted work claimed to be infringed.',
          'URL or listing ID of the infringing content on Dormiqa.',
          'Your contact details (name, phone number, email address).',
          'A statement under penalty of perjury that you are the copyright owner or authorized agent.'
        ]
      }
    ]
  },

  'community-guidelines': {
    id: 'community-guidelines',
    title: 'Community Guidelines',
    category: 'legal',
    categoryLabel: 'Legal',
    lastUpdated: 'August 2026',
    summary: 'Standards of respect, non-discrimination, and ethical conduct across the Dormiqa ecosystem.',
    sections: [
      {
        heading: '1. Inclusive & Non-Discriminatory Search',
        content: 'Dormiqa is committed to providing safe housing access for all university students regardless of state of origin, ethnicity, gender, or religious background. Discrimination in housing listings is strictly prohibited.'
      },
      {
        heading: '2. Professional Student-Agent Etiquette',
        content: 'Users must maintain polite, respectful communication. Offensive language, harassment, unannounced late-night inspection demands, or verbal abuse will result in instant account ban.'
      }
    ]
  },

  // ==========================================
  // TRUST & SAFETY
  // ==========================================
  'verification-policy': {
    id: 'verification-policy',
    title: 'Agent & Listing Verification Policy',
    category: 'trust',
    categoryLabel: 'Trust & Safety',
    lastUpdated: 'August 2026',
    summary: 'Comprehensive multi-tier framework for verifying agent identity, business credentials, and campus listings.',
    badge: 'Trust Framework',
    sections: [
      {
        heading: '1. The Trust Standard',
        content: 'To combat student accommodation scams near Nigerian campuses, Dormiqa enforces a strict multi-layer verification framework before granting "Verified Agent" status.'
      },
      {
        heading: '2. Tiered Verification Levels',
        content: [
          'Tier 1: Identity & NIN Verification — Validation of National Identity Number (NIN) or Driver’s License against official database records.',
          'Tier 2: CAC & Business Registration — For real estate agencies and property firms, proof of Corporate Affairs Commission (CAC) filing.',
          'Tier 3: Physical Campus Gate Verification — On-ground verification of agent presence, physical lodge existence, and walking distance calculation.'
        ]
      },
      {
        heading: '3. Ongoing Compliance Checks',
        content: 'Verified status is subject to continuous review. Agent ratings falling below 3.5 stars or receiving substantiated fraud complaints undergo immediate review and temporary suspension.'
      }
    ]
  },

  'listing-quality-guidelines': {
    id: 'listing-quality-guidelines',
    title: 'Listing Quality Guidelines',
    category: 'trust',
    categoryLabel: 'Trust & Safety',
    lastUpdated: 'August 2026',
    summary: 'Standards for property photos, pricing transparency, facilities, and campus gate walking radius calculation.',
    sections: [
      {
        heading: '1. High-Resolution Photo Standards',
        content: 'Listings must include clear, unedited photographs showing the bedroom, bathroom, kitchen, exterior lodge gate, and surroundings. Dark, blurry, or stock internet photos are rejected.'
      },
      {
        heading: '2. Honest Walking Distance Metrics',
        content: 'Walking minutes to campus gates (e.g. "5 mins walk to UNILAG Main Gate") must be accurately verified using realistic walking speeds. Exaggerated distance claims are flagged and corrected.'
      },
      {
        heading: '3. Transparent Fee Breakdown',
        content: 'Listings must disclose the total breakdown of annual costs: basic rent, caution deposit, electricity/water bill structure, and legal/agency fees.'
      }
    ]
  },

  'review-policy': {
    id: 'review-policy',
    title: 'Review & Rating Policy',
    category: 'trust',
    categoryLabel: 'Trust & Safety',
    lastUpdated: 'August 2026',
    summary: 'How Dormiqa collects, moderates, and protects genuine student reviews and agent ratings.',
    sections: [
      {
        heading: '1. Authentic Student Reviews',
        content: 'Only students who have booked an inspection or verified a completed tenancy through Dormiqa may leave official ratings and text reviews.'
      },
      {
        heading: '2. Zero Tolerance for Fake Reviews',
        content: 'Self-reviews by agents, competitor libel, or paid fake ratings are strictly prohibited and automatically scrubbed by moderation filters.'
      },
      {
        heading: '3. Agent Right of Response',
        content: 'Agents have the right to post a professional, factual response to student reviews on their listing pages.'
      }
    ]
  },

  'anti-fraud-policy': {
    id: 'anti-fraud-policy',
    title: 'Anti-Fraud Policy & Safety Warnings',
    category: 'trust',
    categoryLabel: 'Trust & Safety',
    lastUpdated: 'August 2026',
    summary: 'Key security rules to protect students from housing scams, fake caretakers, and illegal fee demands.',
    badge: 'Critical Student Protection',
    sections: [
      {
        heading: '1. Zero-Tolerance Fraud Stance',
        content: 'Dormiqa operates a zero-tolerance policy regarding housing scams, advance-fee fraud, fake landlord representation, and extortion.'
      },
      {
        heading: '2. Red Flags Every Student Must Know',
        content: 'BEWARE of these common off-campus rental scams:',
        subpoints: [
          'Demand for payment before allowing physical entry to inspect the room.',
          'Caretakers claiming to be out of town or abroad and asking for wire transfers.',
          'Prices drastically lower than current market rates near campus gates.',
          'Pressure to pay immediately to "hold" a room without a signed tenancy agreement.'
        ]
      },
      {
        heading: '3. Golden Rule of Accommodation Hunting',
        content: 'INSPECT FIRST, VERIFY KEYS & LANDLORD IDENTITY, THEN SIGN & PAY DIRECTLY. Never transfer funds based solely on digital photos.'
      }
    ]
  },

  'report-abuse-policy': {
    id: 'report-abuse-policy',
    title: 'Report Abuse & Escalation Policy',
    category: 'trust',
    categoryLabel: 'Trust & Safety',
    lastUpdated: 'August 2026',
    summary: 'Emergency reporting procedures for dangerous listings, harassment, or suspected scams.',
    sections: [
      {
        heading: '1. Instant Reporting Mechanism',
        content: 'Every property listing and user message on Dormiqa includes a one-click "Report Abuse / Scam" button.'
      },
      {
        heading: '2. Triage & SLA',
        content: 'High-priority fraud reports are reviewed by our Trust & Safety Team within 2 to 4 hours. Reported listings are temporarily hidden pending investigation.'
      },
      {
        heading: '3. Law Enforcement Cooperation',
        content: 'In verified criminal scam attempts, Dormiqa cooperates fully with law enforcement authorities (e.g. Nigerian Police Force, EFCC) by providing verified audit trail logs upon valid legal subpoena.'
      }
    ]
  },

  // ==========================================
  // SUPPORT & HELP
  // ==========================================
  'help-centre': {
    id: 'help-centre',
    title: 'Help Centre & Knowledge Base',
    category: 'support',
    categoryLabel: 'Support',
    lastUpdated: 'August 2026',
    summary: 'Comprehensive user guide for students finding housing and agents managing listings.',
    sections: [
      {
        heading: '1. For Students: How to Find Accommodation',
        content: [
          'Step 1: Select your university campus from the top navigation bar.',
          'Step 2: Use the walking radius slider (e.g. 5-15 mins to campus gate) and price filter.',
          'Step 3: Click "Book Free Inspection" to pick a date and time with the verified agent.',
          'Step 4: Chat securely with the caretaker through Dormiqa In-App Messaging.'
        ]
      },
      {
        heading: '2. For Agents: Managing Your Properties',
        content: [
          'Step 1: Complete business verification (NIN & CAC documents).',
          'Step 2: Click "List Accommodation" and enter verified address details and clear photos.',
          'Step 3: Manage inspection requests in your Agent Dashboard calendar.'
        ]
      }
    ]
  },

  'faq': {
    id: 'faq',
    title: 'Frequently Asked Questions (FAQ)',
    category: 'support',
    categoryLabel: 'Support',
    lastUpdated: 'August 2026',
    summary: 'Instant answers to common questions about inspections, fees, verification, and safety.',
    sections: [
      {
        heading: 'Q1: Does Dormiqa charge students for searching or viewing listings?',
        content: 'No! Searching listings and scheduling physical property inspections on Dormiqa is 100% free for students.'
      },
      {
        heading: 'Q2: Does Dormiqa collect rent payments on behalf of landlords?',
        content: 'No. Dormiqa is a technology matching platform. All rent agreements and payments are made directly between you and the verified property agent or caretaker.'
      },
      {
        heading: 'Q3: How do I know if an agent is verified?',
        content: 'Look for the green "Verified Agent" shield badge on listing cards. Verified agents have submitted NIN and business credential checks.'
      },
      {
        heading: 'Q4: What should I do if an agent demands money before showing me the room?',
        content: 'DO NOT PAY. Report the agent immediately using the "Report Listing" button or email [dormiqa.ng@gmail.com]. Demanding upfront viewing fees is against Dormiqa policy.'
      },
      {
        heading: 'Q5: Which universities are currently supported?',
        content: 'Dormiqa currently covers UNILAG, OAU, UI, UNIBEN, FUTA, ABU, UNN, LASU, and major higher education institutions across Nigeria, with rapid expansion to West and East Africa.'
      }
    ]
  },

  'contact-us': {
    id: 'contact-us',
    title: 'Contact Us',
    category: 'support',
    categoryLabel: 'Support',
    lastUpdated: 'August 2026',
    summary: 'Get in touch with our customer success, agent support, and legal teams.',
    sections: [
      {
        heading: '1. Support Channels & Operating Hours',
        content: 'Our team is available Monday through Saturday, 8:00 AM – 6:00 PM (WAT).',
        subpoints: [
          'Support Email: [dormiqa.ng@gmail.com]',
          'Official Phone / WhatsApp: [+234 (0) 800-DORMIQA / +234 800 226 7672]'
        ]
      },
      {
        heading: '2. Headquarters Office Address',
        content: '[Dormiqa Technologies Limited, Plot 12 Campus Way, Yaba, Lagos State, Nigeria].'
      }
    ]
  },

  'report-a-problem': {
    id: 'report-a-problem',
    title: 'Report a Problem or Technical Bug',
    category: 'support',
    categoryLabel: 'Support',
    lastUpdated: 'August 2026',
    summary: 'Direct channel to report software bugs, listing discrepancies, or service outages.',
    sections: [
      {
        heading: '1. Technical Bug Reporting',
        content: 'Encountering a glitch in search, messaging, or calendar bookings? Email [dormiqa.ng@gmail.com] with your device type, screenshot, and description of the issue.'
      },
      {
        heading: '2. Listing Discrepancy',
        content: 'If a property you physically inspected differs significantly from its Dormiqa listing photos or price, notify our team immediately for prompt correction or removal.'
      }
    ]
  },

  // ==========================================
  // COMPANY & PRESS
  // ==========================================
  'about-dormiqa': {
    id: 'about-dormiqa',
    title: 'About Dormiqa',
    category: 'company',
    categoryLabel: 'Company',
    lastUpdated: 'August 2026',
    summary: 'The story and driving force behind Africa’s leading student housing technology platform.',
    sections: [
      {
        heading: '1. Our Story',
        content: 'Dormiqa was born out of a real problem faced by millions of university students across Nigeria and Africa: finding safe, affordable, and honest off-campus housing near university gates. For decades, students faced extortionate viewing fees, unverified middle-men, fake listings, and unsafe living conditions.'
      },
      {
        heading: '2. The Technology Platform Solution',
        content: 'Dormiqa transforms student accommodation hunting into a seamless, transparent experience. By combining verified agent credentials, precise campus gate walking distance calculations, and scheduled physical inspection tools, Dormiqa empowers students to secure ideal lodges with total peace of mind.'
      }
    ]
  },

  'our-mission': {
    id: 'our-mission',
    title: 'Our Mission',
    category: 'company',
    categoryLabel: 'Company',
    lastUpdated: 'August 2026',
    summary: 'To make finding safe, verified, affordable off-campus housing effortless for every African student.',
    sections: [
      {
        heading: 'Core Mission Statement',
        content: 'Our mission is to eliminate student housing anxiety across Africa by building transparent, technology-driven marketplace solutions that connect tertiary institution students directly with verified property hosts.'
      }
    ]
  },

  'our-vision': {
    id: 'our-vision',
    title: 'Our Vision',
    category: 'company',
    categoryLabel: 'Company',
    lastUpdated: 'August 2026',
    summary: 'To become Africa’s most trusted digital infrastructure for student living and campus mobility.',
    sections: [
      {
        heading: 'Long-Term Strategic Vision',
        content: 'We envision a future where every student admitted into a tertiary institution across Africa can effortlessly discover, inspect, and secure verified accommodation within a 15-minute walking radius of their campus gate before arriving on campus.'
      }
    ]
  },

  'how-dormiqa-works': {
    id: 'how-dormiqa-works',
    title: 'How Dormiqa Works',
    category: 'company',
    categoryLabel: 'Company',
    lastUpdated: 'August 2026',
    summary: 'Step-by-step breakdown of the Dormiqa platform ecosystem for students and agents.',
    sections: [
      {
        heading: '1. For Students (4 Easy Steps)',
        content: [
          '1. Campus-Centric Search: Filter hostels and self-contain apartments by walking distance (minutes to campus gate).',
          '2. Verified Information: View high-resolution photos, verified amenities, and transparent annual price breakdowns.',
          '3. Schedule Free Physical Inspection: Pick your preferred date and time to inspect the property in person.',
          '4. Direct Tenancy & Keys: Inspect the room, verify caretaker credentials, and execute tenancy directly.'
        ]
      },
      {
        heading: '2. For Property Agents & Caretakers',
        content: [
          '1. Identity Verification: Submit NIN and CAC credentials for quick verification.',
          '2. Easy Listing Management: Upload photos, set walking distances, and manage availability.',
          '3. Direct Student Leads: Receive organized inspection bookings and chat with verified students.'
        ]
      }
    ]
  },

  'become-an-agent': {
    id: 'become-an-agent',
    title: 'Become a Verified Property Agent',
    category: 'company',
    categoryLabel: 'Company',
    lastUpdated: 'August 2026',
    summary: 'Join Nigeria’s largest verified network of student accommodation caretakers and estate managers.',
    sections: [
      {
        heading: '1. Why Partner with Dormiqa?',
        content: 'As a Verified Dormiqa Agent, you gain direct access to thousands of university students searching for off-campus hostels each academic session.',
        subpoints: [
          'High Conversion Leads: Connect with serious students ready for physical viewings.',
          'Verified Agent Badge: Stand out from unverified street middle-men with a trust badge.',
          'Dashboard Management: Organize inspection schedules and chat history in one place.'
        ]
      },
      {
        heading: '2. Registration Requirements',
        content: 'Submit valid NIN identification, active phone number, property details, and agreement to uphold Dormiqa’s Anti-Extortion & Quality Guidelines.'
      }
    ]
  },

  'careers': {
    id: 'careers',
    title: 'Careers at Dormiqa',
    category: 'company',
    categoryLabel: 'Company',
    lastUpdated: 'August 2026',
    summary: 'Join our team as we build Africa’s leading student living technology platform.',
    badge: 'Coming Soon',
    sections: [
      {
        heading: 'Building the Future of Campus Prop-Tech',
        content: 'We are expanding our software development, trust & safety operations, campus ambassador networks, and legal teams across Nigeria and broader Africa.'
      },
      {
        heading: 'Talent Network Registration',
        content: 'Interested in joining Dormiqa as a Campus Lead, Software Engineer, or Operations Specialist? Send your CV to [dormiqa.ng@gmail.com].'
      }
    ]
  },

  'press-kit': {
    id: 'press-kit',
    title: 'Press Kit & Media Assets',
    category: 'company',
    categoryLabel: 'Company',
    lastUpdated: 'August 2026',
    summary: 'Official logos, brand guidelines, executive bios, and press contact information.',
    badge: 'Coming Soon',
    sections: [
      {
        heading: 'Media Contact & Enquiries',
        content: 'For media enquiries, interview requests with our founders, or brand asset kits, email [dormiqa.ng@gmail.com].'
      },
      {
        heading: 'Brand Assets Notice',
        content: 'Dormiqa logos, brand color palettes, and press releases may be used by accredited journalists in accordance with our Intellectual Property Policy.'
      }
    ]
  }
};

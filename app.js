// In-Memory Storage System with localStorage persistence
const storageDB = {
    userData: {
        quizHistory: [],
        lectureProgress: {},
        subjectStats: {},
        achievements: [],
        totalQuizzes: 0,
        totalCorrect: 0,
        totalQuestions: 0,
        studyStreak: 0,
        lastStudyDate: null,
        bookmarkedQuestions: [],
        theme: 'light'
    },
    
    // Load data from localStorage
    load() {
        try {
            const saved = localStorage.getItem('quizAppData');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.userData = { ...this.userData, ...parsed };
            }
        } catch (error) {
            console.error('Error loading data from localStorage:', error);
        }
    },
    
    // Save data to localStorage
    save() {
        try {
            localStorage.setItem('quizAppData', JSON.stringify(this.userData));
        } catch (error) {
            console.error('Error saving data to localStorage:', error);
        }
    },
    
    save(key, value) {
        this.userData[key] = value;
        this.save();
    },
    
    get(key) {
        return this.userData[key];
    },
    
    updateStats(subjectId, lectureId, score, total, time) {
        // Update quiz history
        this.userData.quizHistory.push({
            subjectId,
            lectureId,
            score,
            total,
            percentage: Math.round((score / total) * 100),
            time,
            date: new Date().toISOString()
        });
        
        // Update lecture progress
        const lectureKey = `${subjectId}_${lectureId}`;
        if (!this.userData.lectureProgress[lectureKey]) {
            this.userData.lectureProgress[lectureKey] = [];
        }
        this.userData.lectureProgress[lectureKey].push({
            score,
            total,
            percentage: Math.round((score / total) * 100),
            date: new Date().toISOString()
        });
        
        // Update subject stats
        if (!this.userData.subjectStats[subjectId]) {
            this.userData.subjectStats[subjectId] = {
                totalQuizzes: 0,
                totalScore: 0,
                totalQuestions: 0,
                bestScore: 0
            };
        }
        this.userData.subjectStats[subjectId].totalQuizzes++;
        this.userData.subjectStats[subjectId].totalScore += score;
        this.userData.subjectStats[subjectId].totalQuestions += total;
        const percentage = Math.round((score / total) * 100);
        if (percentage > this.userData.subjectStats[subjectId].bestScore) {
            this.userData.subjectStats[subjectId].bestScore = percentage;
        }
        
        // Update totals
        this.userData.totalQuizzes++;
        this.userData.totalCorrect += score;
        this.userData.totalQuestions += total;
        
        // Check achievements
        this.checkAchievements();
        
        // Update study streak
        this.updateStudyStreak();
        
        // Save to localStorage
        this.save();
    },
    
    updateStudyStreak() {
        const today = new Date().toDateString();
        const lastDate = this.userData.lastStudyDate;
        
        if (lastDate === today) {
            return; // Already studied today
        }
        
        if (lastDate) {
            const last = new Date(lastDate);
            const now = new Date();
            const diffTime = Math.abs(now - last);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                this.userData.studyStreak++;
            } else if (diffDays > 1) {
                this.userData.studyStreak = 1;
            }
        } else {
            this.userData.studyStreak = 1;
        }
        
        this.userData.lastStudyDate = today;
        this.save();
    },
    
    checkAchievements() {
        const achievements = [
            {
                id: 'first_quiz',
                condition: () => this.userData.totalQuizzes >= 1
            },
            {
                id: 'perfect_score',
                condition: () => this.userData.quizHistory.some(q => q.percentage === 100)
            },
            {
                id: 'streak_7',
                condition: () => this.userData.studyStreak >= 7
            },
            {
                id: 'quiz_master',
                condition: () => this.userData.totalQuizzes >= 10
            },
            {
                id: 'century',
                condition: () => this.userData.totalCorrect >= 100
            }
        ];
        
        achievements.forEach(achievement => {
            if (achievement.condition() && !this.userData.achievements.includes(achievement.id)) {
                this.userData.achievements.push(achievement.id);
                showToast(`🎉 New Achievement: ${getAchievementName(achievement.id)}`);
                this.save();
            }
        });
    }
};

// Application State with localStorage persistence
let appState = {
    currentSubject: null,
    currentLecture: null,
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    bookmarkedQuestions: [],
    startTime: null,
    timerInterval: null,
    previousPage: null,
    feedbackShown: false
};


// Comprehensive Subjects Data with Lectures
const subjects = [
   {
        id: 'ethicalhacking',
        name: 'الاختراق الأخلاقي',
        nameEn: 'Ethical Hacking',
        icon: 'fa-shield-alt',
        color: '#e11d48',
        description: 'مبادئ وممارسات الأمن الهجومي',
        lectures: [
            {
                id: 1,
                title: 'مقدمة في الاختراق الأخلاقي',
                duration: '60 دقيقة',
                questionCount: 37,
                topics: ['تعريف الاختراق الأخلاقي', 'أنواع الهاكرز', 'مراحل الاختراق', 'مثلث CIA']
            },
            {
                id: 2,
                title: 'البصمة الرقمية والاستطلاع',
                duration: '65 دقيقة',
                questionCount: 48,
                topics: ['Footprinting', 'Google Dorking', 'Shodan', 'WHOIS', 'DNS Tools']
            },
            {
                id: 3,
                title: 'مسح الشبكات',
                duration: '40 دقيقة',
                questionCount: 21,
                topics: ['Host Discovery', 'Port Scanning', 'Banner Grabbing', 'Nessus']
            }
        ]
    },
    {
        id: 'crypto',
        name: 'التشفير',
        nameEn: 'Cryptography',
        icon: 'fa-lock',
        color: '#8b5cf6',
        description: 'أمان المعلومات والخوارزميات الخفية',
        lectures: [
            { id: 1, title: 'أساسيات علم التشفير', duration: '40 دقيقة', questionCount: 25, topics: ['التاريخ', 'المفاهيم الأساسية', 'أنواع التشفير'] },
            { id: 2, title: 'التشفير المتماثل', duration: '50 دقيقة', questionCount: 35, topics: ['DES', 'AES', 'Stream Ciphers', 'Block Ciphers'] },
            { id: 3, title: 'التشفير غير المتماثل', duration: '55 دقيقة', questionCount: 40, topics: ['RSA', 'ECC', 'Diffie-Hellman'] },
            { id: 4, title: 'دوال الهاش', duration: '45 دقيقة', questionCount: 30, topics: ['SHA Family', 'MD5', 'Message Integrity'] },
            { id: 5, title: 'التوقيعات الرقمية', duration: '40 دقيقة', questionCount: 25, topics: ['DSA', 'ECDSA', 'Authentication'] },
            { id: 6, title: 'إدارة المفاتيح', duration: '45 دقيقة', questionCount: 28, topics: ['PKI', 'Certificate Authority'] },
            { id: 7, title: 'بروتوكولات الأمان', duration: '50 دقيقة', questionCount: 35, topics: ['TLS/SSL', 'IPSec', 'Kerberos'] },
            { id: 8, title: 'التشفير الحديث', duration: '55 دقيقة', questionCount: 40, topics: ['Post-Quantum', 'Homomorphic'] },
            { id: 9, title: 'تحليل وكسر التشفير', duration: '60 دقيقة', questionCount: 45, topics: ['Attack Methods', 'Side-channel'] },
            { id: 10, title: 'تطبيقات التشفير', duration: '40 دقيقة', questionCount: 25, topics: ['Blockchain', 'Digital Currencies'] }
        ]
    },
    {
        id: 'networks',
        name: 'شبكات الحاسوب',
        nameEn: 'Computer Networks',
        icon: 'fa-network-wired',
        color: '#14b8a6',
        description: 'الاتصالات والبروتوكولات الشبكية',
        lectures: [
            { id: 1, title: 'مقدمة في الشبكات', duration: '45 دقيقة', questionCount: 25, topics: ['Network Types', 'Topology', 'Components'] },
            { id: 2, title: 'نموذج OSI', duration: '50 دقيقة', questionCount: 35, topics: ['7 Layers', 'Encapsulation', 'Protocol Stack'] },
            { id: 3, title: 'طبقة الشبكة', duration: '55 دقيقة', questionCount: 40, topics: ['IP Protocol', 'Routing', 'ICMP', 'IPv6'] },
            { id: 4, title: 'طبقة النقل', duration: '50 دقيقة', questionCount: 35, topics: ['TCP', 'UDP', 'Port Numbers'] },
            { id: 5, title: 'خوارزميات التوجيه', duration: '60 دقيقة', questionCount: 45, topics: ['Distance Vector', 'Link State', 'OSPF'] },
            { id: 6, title: 'الشبكات اللاسلكية', duration: '45 دقيقة', questionCount: 30, topics: ['WiFi', 'Bluetooth', 'Cellular'] },
            { id: 7, title: 'أمان الشبكات', duration: '55 دقيقة', questionCount: 40, topics: ['Firewalls', 'VPN', 'IDS/IPS'] },
            { id: 8, title: 'إدارة الشبكات', duration: '40 دقيقة', questionCount: 25, topics: ['SNMP', 'Monitoring', 'Performance'] },
            { id: 9, title: 'الشبكات المتقدمة', duration: '50 دقيقة', questionCount: 35, topics: ['SDN', 'Cloud Networks', '5G'] }
        ]
    },
    {
        id: 'database',
        name: 'قواعد البيانات',
        nameEn: 'Database Systems',
        icon: 'fa-database',
        color: '#f59e0b',
        description: 'تصميم وإدارة قواعد البيانات',
        lectures: [
            { id: 1, title: 'مقدمة في قواعد البيانات', duration: '40 دقيقة', questionCount: 25, topics: ['DBMS', 'Data Models', 'Architecture'] },
            { id: 2, title: 'النمذجة العلاقية', duration: '50 دقيقة', questionCount: 35, topics: ['Tables', 'Keys', 'Integrity'] },
            { id: 3, title: 'لغة SQL', duration: '60 دقيقة', questionCount: 45, topics: ['SELECT', 'JOIN', 'Functions', 'Subqueries'] },
            { id: 4, title: 'تصميم قواعد البيانات', duration: '55 دقيقة', questionCount: 40, topics: ['ER Diagrams', 'Normalization'] },
            { id: 5, title: 'المعاملات والتزامن', duration: '50 دقيقة', questionCount: 35, topics: ['ACID', 'Locking', 'Deadlock'] },
            { id: 6, title: 'فهرسة البيانات', duration: '45 دقيقة', questionCount: 30, topics: ['B-Trees', 'Hash Indexes'] },
            { id: 7, title: 'قواعد البيانات الموزعة', duration: '50 دقيقة', questionCount: 35, topics: ['Distribution', 'Replication'] },
            { id: 8, title: 'قواعد البيانات الحديثة', duration: '45 دقيقة', questionCount: 30, topics: ['NoSQL', 'Big Data', 'Cloud'] }
        ]
    },
    {
        id: 'software',
        name: 'هندسة البرمجيات',
        nameEn: 'Software Engineering',
        icon: 'fa-code',
        color: '#10b981',
        description: 'منهجيات تطوير البرمجيات',
        lectures: [
            { id: 1, title: 'مقدمة في هندسة البرمجيات', duration: '45 دقيقة', questionCount: 25, topics: ['Software Crisis', 'Principles'] },
            { id: 2, title: 'دورة حياة البرمجيات', duration: '55 دقيقة', questionCount: 40, topics: ['Waterfall', 'Agile', 'Scrum'] },
            { id: 3, title: 'تحليل المتطلبات', duration: '50 دقيقة', questionCount: 35, topics: ['Gathering', 'Documentation', 'UML'] },
            { id: 4, title: 'التصميم المعماري', duration: '60 دقيقة', questionCount: 45, topics: ['Design Patterns', 'Architecture'] },
            { id: 5, title: 'اختبار البرمجيات', duration: '55 دقيقة', questionCount: 40, topics: ['Testing Levels', 'Strategies'] },
            { id: 6, title: 'إدارة المشاريع', duration: '45 دقيقة', questionCount: 30, topics: ['Planning', 'Risk Management'] },
            { id: 7, title: 'ضمان الجودة', duration: '40 دقيقة', questionCount: 25, topics: ['Quality Models', 'Reviews', 'Standards'] }
        ]
    },
    {
        id: 'ai',
        name: 'الذكاء الاصطناعي',
        nameEn: 'Artificial Intelligence',
        icon: 'fa-brain',
        color: '#ef4444',
        description: 'تقنيات وخوارزميات الذكاء الاصطناعي',
        lectures: [
            { id: 1, title: 'مقدمة في الذكاء الاصطناعي', duration: '40 دقيقة', questionCount: 25, topics: ['History', 'Applications', 'Types'] },
            { id: 2, title: 'خوارزميات البحث', duration: '55 دقيقة', questionCount: 40, topics: ['BFS', 'DFS', 'A*', 'Heuristic'] },
            { id: 3, title: 'المنطق والاستدلال', duration: '50 دقيقة', questionCount: 35, topics: ['Propositional Logic', 'Inference'] },
            { id: 4, title: 'التعلم الآلي', duration: '60 دقيقة', questionCount: 45, topics: ['Supervised', 'Unsupervised', 'Reinforcement'] },
            { id: 5, title: 'الشبكات العصبية', duration: '55 دقيقة', questionCount: 40, topics: ['Perceptron', 'Backpropagation', 'Deep Learning'] },
            { id: 6, title: 'معالجة اللغة الطبيعية', duration: '50 دقيقة', questionCount: 35, topics: ['Tokenization', 'Parsing', 'Sentiment'] },
            { id: 7, title: 'الرؤية الحاسوبية', duration: '55 دقيقة', questionCount: 40, topics: ['Image Processing', 'Feature Detection'] },
            { id: 8, title: 'النظم الخبيرة', duration: '45 دقيقة', questionCount: 30, topics: ['Knowledge Base', 'Inference Engine'] },
            { id: 9, title: 'التعلم التعزيزي', duration: '50 دقيقة', questionCount: 35, topics: ['Q-Learning', 'Policy Gradient'] },
            { id: 10, title: 'أخلاقيات الذكاء الاصطناعي', duration: '40 دقيقة', questionCount: 25, topics: ['Bias', 'Transparency', 'Future'] }
        ]
    }
];

// Sample Questions Bank
const questionsBank = {
    'Ethical Hacking': [
        // Lecture 1: Introduction to Ethical Hacking (37 questions)
            {
                lecture: "1",
                question: "What is the correct definition of ethical hacking?",
                category: "Ethical Hacking Basics",
                difficulty: "easy",
                hint: "Think about legal and authorized practice",
                options: [
                    "Hacking systems without permission for educational purposes",
                    "The legal and authorized practice of bypassing system security to identify vulnerabilities",
                    "Stealing data from large corporations",
                    "Hacking systems to prove personal skills"
                ],
                correct: 1
            },
            {
                lecture: "1",
                question: "What is the primary goal of ethical hacking?",
                category: "Ethical Hacking Basics",
                difficulty: "easy",
                hint: "Related to identifying weaknesses before malicious attackers",
                options: [
                    "To test network speed",
                    "To identify security vulnerabilities before malicious hackers can exploit them",
                    "To improve system performance",
                    "To develop new software"
                ],
                correct: 1
            },
            {
                lecture: "1",
                question: "Which characteristic must be present in ethical hacking?",
                category: "Ethical Hacking Basics",
                difficulty: "medium",
                hint: "Think about permission and documentation",
                options: [
                    "Speed of execution",
                    "Using only free tools",
                    "Permission-based and documented",
                    "Always working individually"
                ],
                correct: 2
            },
            {
                lecture: "1",
                question: "Who are White Hat Hackers?",
                category: "Types of Hackers",
                difficulty: "easy",
                hint: "Ethical security professionals",
                options: [
                    "Malicious hackers who steal data",
                    "Ethical security professionals who hack with explicit permission to improve security systems",
                    "Hackers working in gray areas",
                    "Hackers who sell exploits to the highest bidder"
                ],
                correct: 1
            },
            {
                lecture: "1",
                question: "What characterizes Black Hat Hackers?",
                category: "Types of Hackers",
                difficulty: "easy",
                hint: "Malicious actors",
                options: [
                    "Work with companies to improve security",
                    "Disclose vulnerabilities responsibly",
                    "Work in security training",
                    "Malicious actors who exploit vulnerabilities for personal gain or data theft"
                ],
                correct: 3
            },
            {
                lecture: "1",
                question: "How do Grey Hat Hackers differ from others?",
                category: "Types of Hackers",
                difficulty: "medium",
                hint: "They work in ethical gray areas",
                options: [
                    "They always work with official permission",
                    "They work in ethical gray areas and sometimes disclose vulnerabilities responsibly without permission",
                    "They only hack for harm",
                    "They don't have sufficient technical skills"
                ],
                correct: 1
            },
            {
                lecture: "1",
                question: "What is the first phase of the five ethical hacking phases?",
                category: "Hacking Phases",
                difficulty: "easy",
                hint: "Gathering information about the target",
                options: [
                    "Scanning",
                    "Reconnaissance",
                    "Gaining Access",
                    "Maintaining Access"
                ],
                correct: 1
            },
            {
                lecture: "1",
                question: "What happens in the Reconnaissance phase?",
                category: "Hacking Phases",
                difficulty: "medium",
                hint: "Initial information gathering phase",
                options: [
                    "Scanning open ports",
                    "Gathering as much information as possible about the target system",
                    "Installing backdoors",
                    "Deleting system logs"
                ],
                correct: 1
            },
            {
                lecture: "1",
                question: "What is the goal of the Scanning phase?",
                category: "Hacking Phases",
                difficulty: "medium",
                hint: "Identifying ports and active devices",
                options: [
                    "Gathering social media information",
                    "Identifying open ports, active devices, and services on the target network",
                    "Breaking into the system",
                    "Creating a final report"
                ],
                correct: 1
            },
            {
                lecture: "1",
                question: "In the Gaining Access phase, what does the hacker do?",
                category: "Hacking Phases",
                difficulty: "medium",
                hint: "Using discovered vulnerabilities",
                options: [
                    "Uses vulnerabilities discovered during scanning to gain unauthorized access to the system",
                    "Only scans the network",
                    "Documents the results",
                    "Deletes all files"
                ],
                correct: 0
            },
            {
                lecture: "1",
                question: "What is the purpose of the Maintaining Access phase?",
                category: "Hacking Phases",
                difficulty: "medium",
                hint: "Keeping a foothold in the system",
                options: [
                    "Deleting all data",
                    "Fixing security vulnerabilities",
                    "Maintaining a foothold in the target system to perform additional actions like data extraction",
                    "Ending the test immediately"
                ],
                correct: 2
            },
            {
                lecture: "1",
                question: "What does the final Covering Tracks phase involve?",
                category: "Hacking Phases",
                difficulty: "medium",
                hint: "Ensuring the hacker's presence remains undetected",
                options: [
                    "Ensuring the hacker's presence remains undetected by removing evidence",
                    "Publishing results online",
                    "Sending a report to management",
                    "Installing more tools"
                ],
                correct: 0
            },
            {
                lecture: "1",
                question: "What is the definition of Malware?",
                category: "Cybersecurity Terms",
                difficulty: "easy",
                hint: "Malicious software",
                options: [
                    "A program to protect systems",
                    "A tool to speed up the network",
                    "A new operating system",
                    "Software designed to damage, disrupt, or gain unauthorized access to computer systems"
                ],
                correct: 3
            },
            {
                lecture: "1",
                question: "What is a Vulnerability in cybersecurity context?",
                category: "Cybersecurity Terms",
                difficulty: "easy",
                hint: "A weakness in the system",
                options: [
                    "A new feature in the system",
                    "A weakness in a system that can be exploited by an attacker to perform unauthorized actions",
                    "An advanced protection program",
                    "A type of database"
                ],
                correct: 1
            },
            {
                lecture: "1",
                question: "What is an Exploit?",
                category: "Cybersecurity Terms",
                difficulty: "medium",
                hint: "Code or command that takes advantage of a vulnerability",
                options: [
                    "A piece of software, code, or sequence of commands that takes advantage of a specific vulnerability",
                    "A backup tool",
                    "A type of virus",
                    "An antivirus program"
                ],
                correct: 0
            },
            {
                lecture: "1",
                question: "What does SQL Injection mean?",
                category: "Cybersecurity Terms",
                difficulty: "medium",
                hint: "An attack targeting databases",
                options: [
                    "A method to improve database performance",
                    "A new programming language",
                    "An attack technique that exploits vulnerabilities in database applications",
                    "A backup creation tool"
                ],
                correct: 2
            },
            {
                lecture: "1",
                question: "What is Phishing?",
                category: "Cybersecurity Terms",
                difficulty: "easy",
                hint: "A social engineering attack",
                options: [
                    "An advanced encryption technique",
                    "A type of firewall",
                    "A social engineering attack used to trick users into revealing sensitive information",
                    "A secure network protocol"
                ],
                correct: 2
            },
            {
                lecture: "1",
                question: "What is Ransomware?",
                category: "Cybersecurity Terms",
                difficulty: "medium",
                hint: "Software that encrypts data and demands ransom",
                options: [
                    "A program to encrypt data for protection",
                    "A type of malware that encrypts victim's data and demands ransom for decryption",
                    "A cloud backup tool",
                    "A password management system"
                ],
                correct: 1
            },
            {
                lecture: "1",
                question: "What is a DoS Attack?",
                category: "Cybersecurity Terms",
                difficulty: "medium",
                hint: "Denial of Service attack",
                options: [
                    "A method to speed up services",
                    "A type of encryption",
                    "An attack aimed at making a service unavailable by flooding it with excessive traffic",
                    "A new security protocol"
                ],
                correct: 2
            },
            {
                lecture: "1",
                question: "What does Firewall mean?",
                category: "Cybersecurity Terms",
                difficulty: "easy",
                hint: "A network defense system",
                options: [
                    "A network security system that monitors and controls incoming and outgoing traffic",
                    "A program to speed up the internet",
                    "A type of virus",
                    "A data analysis tool"
                ],
                correct: 0
            },
            {
                lecture: "1",
                question: "What is an IDS (Intrusion Detection System)?",
                category: "Cybersecurity Terms",
                difficulty: "medium",
                hint: "Intrusion detection system",
                options: [
                    "A network acceleration system",
                    "An email management program",
                    "A system that monitors the network or system for malicious activity or policy violations",
                    "A website development tool"
                ],
                correct: 2
            },
            {
                lecture: "1",
                question: "What does the C in the CIA triad represent?",
                category: "CIA Triad",
                difficulty: "easy",
                hint: "Related to information privacy",
                options: [
                    "Compression",
                    "Confidentiality",
                    "Certification",
                    "Consistency"
                ],
                correct: 1
            },
            {
                lecture: "1",
                question: "What is the Confidentiality principle?",
                category: "CIA Triad",
                difficulty: "medium",
                hint: "Related to authorized access to information",
                options: [
                    "Ensuring fast data access",
                    "Ensuring information is accessible only to those authorized to access it",
                    "Verifying data accuracy",
                    "24/7 service availability"
                ],
                correct: 1
            },
            {
                lecture: "1",
                question: "What does the Integrity principle mean?",
                category: "CIA Triad",
                difficulty: "medium",
                hint: "Related to data accuracy and completeness",
                options: [
                    "Maintaining data accuracy and completeness throughout its lifecycle",
                    "Data processing speed",
                    "Providing multiple backups",
                    "Encrypting all data"
                ],
                correct: 0
            },
            {
                lecture: "1",
                question: "What is the Availability principle in the CIA triad?",
                category: "CIA Triad",
                difficulty: "medium",
                hint: "Related to resource accessibility",
                options: [
                    "Providing maximum network speed",
                    "Protecting data from theft",
                    "Ensuring authorized users have reliable and timely access to resources",
                    "Encrypting all communications"
                ],
                correct: 2
            },
            {
                lecture: "1",
                question: "Why is balancing the three CIA elements important?",
                category: "CIA Triad",
                difficulty: "hard",
                hint: "Excessive focus on one aspect weakens others",
                options: [
                    "To reduce costs only",
                    "To speed up application development",
                    "Because excessive focus on one element often weakens the others",
                    "To facilitate maintenance"
                ],
                correct: 2
            },
            {
                lecture: "1",
                question: "What's the difference between Passive and Active attacks?",
                category: "Attack Types",
                difficulty: "medium",
                hint: "Passive monitors only, active makes changes",
                options: [
                    "Passive is faster than active",
                    "Passive attacks monitor systems without changing data, while active attacks disrupt or harm system resources",
                    "Passive requires more complex tools",
                    "There's no real difference"
                ],
                correct: 1
            },
            {
                lecture: "1",
                question: "What are common Attack Vectors?",
                category: "Attack Vectors",
                difficulty: "medium",
                hint: "Methods attackers use to breach systems",
                options: [
                    "Free and open-source software",
                    "Compromised credentials, malware, phishing, insider threats, unpatched systems",
                    "Cloud computing usage",
                    "Smartphone applications"
                ],
                correct: 1
            },
            {
                lecture: "1",
                question: "What is Social Engineering?",
                category: "Attack Vectors",
                difficulty: "medium",
                hint: "Manipulating people",
                options: [
                    "Manipulating people to reveal confidential information or perform actions that compromise security",
                    "An advanced software technique",
                    "A type of firewall",
                    "A new network protocol"
                ],
                correct: 0
            },
            {
                lecture: "1",
                question: "What are types of Malware attacks?",
                category: "Attack Categories",
                difficulty: "medium",
                hint: "Viruses, worms, and ransomware",
                options: [
                    "Only viruses",
                    "Viruses, worms, ransomware, spyware",
                    "Only spyware",
                    "Only adware"
                ],
                correct: 1
            },
            {
                lecture: "1",
                question: "What are Network Attacks?",
                category: "Attack Categories",
                difficulty: "medium",
                hint: "Attacks targeting the network",
                options: [
                    "Attacks on applications only",
                    "DDoS, Man-in-the-Middle (MITM), Sniffing",
                    "Attacks on physical devices only",
                    "Attacks on databases only"
                ],
                correct: 1
            },
            {
                lecture: "1",
                question: "What are Application Attacks?",
                category: "Attack Categories",
                difficulty: "medium",
                hint: "Attacks targeting applications and web",
                options: [
                    "Network attacks only",
                    "SQL Injection, XSS, authentication vulnerabilities",
                    "Virus attacks only",
                    "Mobile device attacks only"
                ],
                correct: 1
            },
            {
                lecture: "1",
                question: "What are Credential Attacks?",
                category: "Attack Categories",
                difficulty: "medium",
                hint: "Attacks on credentials",
                options: [
                    "Attacks on physical devices",
                    "Network attacks only",
                    "Database attacks only",
                    "Brute Force, Credential Stuffing, Password Spraying"
                ],
                correct: 3
            },
            {
                lecture: "1",
                question: "What are Supply Chain Attacks?",
                category: "Attack Categories",
                difficulty: "hard",
                hint: "Attacks through the supply chain",
                options: [
                    "Attacks on physical warehouses",
                    "Attacks on transportation",
                    "Poisoned updates and compromised third-party software",
                    "Attacks on suppliers only"
                ],
                correct: 2
            },
            {
                lecture: "1",
                question: "What are common reconnaissance tools?",
                category: "Reconnaissance & Scanning",
                difficulty: "medium",
                hint: "Information gathering tools",
                options: [
                    "OSINT, social media analysis, public records",
                    "Web browsers only",
                    "Antivirus programs only",
                    "Encryption tools only"
                ],
                correct: 0
            },
            {
                lecture: "1",
                question: "What information is gathered in the reconnaissance phase?",
                category: "Reconnaissance & Scanning",
                difficulty: "medium",
                hint: "Network, domain, and employee information",
                options: [
                    "Email addresses only",
                    "Network information, domain details, employee data, technology stack, organizational structure",
                    "IP addresses only",
                    "Usernames only"
                ],
                correct: 1
            },
            {
                lecture: "1",
                question: "What is the importance of documented ethical hacking?",
                category: "Ethical Hacking Basics",
                difficulty: "medium",
                hint: "Recording all actions and findings",
                options: [
                    "Not documenting anything for confidentiality",
                    "Documenting final results only",
                    "Recording all actions and findings comprehensively",
                    "Documenting errors only"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What is the definition of Footprinting?",
                category: "Footprinting Basics",
                difficulty: "easy",
                hint: "Process of gathering information about a target",
                options: [
                    "Process of hacking systems",
                    "Process of software development",
                    "Process of gathering information about a target (organization, domain, person)",
                    "Process of data encryption"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What are the two types of reconnaissance in Footprinting?",
                category: "Footprinting Basics",
                difficulty: "easy",
                hint: "Passive and Active",
                options: [
                    "Fast and Slow",
                    "Internal and External",
                    "Passive and Active",
                    "Automatic and Manual"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What is the difference between passive and active reconnaissance?",
                category: "Footprinting Basics",
                difficulty: "medium",
                hint: "Direct interaction with the target",
                options: [
                    "Passive is faster than active",
                    "Passive doesn't directly interact with the target, while active uses direct queries/scans",
                    "Passive is more dangerous than active",
                    "There's no real difference"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "What is the main goal of Reconnaissance?",
                category: "Footprinting Basics",
                difficulty: "medium",
                hint: "Mapping the attack surface",
                options: [
                    "Application development",
                    "Performance improvement",
                    "Map attack surface and plan tests or defenses",
                    "Creating backups"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What is the benefit of using search engines in reconnaissance?",
                category: "Search Engine Tools",
                difficulty: "medium",
                hint: "Low-cost, high-value passive technique",
                options: [
                    "Only for general information search",
                    "Find exposed files, indexed pages, and public records - low-cost, high-value passive technique",
                    "Only for advertisements",
                    "Only for SEO improvement"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "What is Google Dorking?",
                category: "Google Hacking",
                difficulty: "medium",
                hint: "Use of advanced search operators",
                options: [
                    "Using Google for entertainment",
                    "Improving website visibility in Google",
                    "Use advanced operators like filetype:, inurl:, intitle:, site: to find hidden content",
                    "Creating Google ads"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What is an example of using Google Dork?",
                category: "Google Hacking",
                difficulty: "medium",
                hint: "Search in a specific site for a specific file type",
                options: [
                    "www.google.com",
                    "search google.com",
                    "site:target.com filetype:sql",
                    "find target"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What are the advanced Google Dorking operators?",
                category: "Google Hacking",
                difficulty: "medium",
                hint: "Tools for specialized search",
                options: [
                    "Only regular words",
                    "filetype:, inurl:, intitle:, site:, intext:",
                    "Only numbers",
                    "Only images"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "What can Google Dorking reveal?",
                category: "Google Hacking",
                difficulty: "medium",
                hint: "Sensitive files and configurations",
                options: [
                    "Only home pages",
                    "Only images",
                    "Exposed config files, logs, admin pages, backup files",
                    "Only videos"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What is Shodan?",
                category: "Shodan",
                difficulty: "medium",
                hint: "Search engine for Internet-connected devices",
                options: [
                    "A new web browser",
                    "An operating system",
                    "Search engine for Internet-connected devices and services (IoT, servers, DBs)",
                    "A programming language"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What does Shodan return in search results?",
                category: "Shodan",
                difficulty: "medium",
                hint: "Device and service information",
                options: [
                    "Only website URLs",
                    "Open ports, service banners, software versions",
                    "Only images",
                    "Only videos"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "Why is Shodan useful for cybersecurity?",
                category: "Shodan",
                difficulty: "medium",
                hint: "Discovering exposed infrastructure",
                options: [
                    "To speed up the internet",
                    "For website design improvement",
                    "To discover exposed infrastructure and vulnerable services",
                    "To create advertisements"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What is HTTrack?",
                category: "Website Recon Tools",
                difficulty: "medium",
                hint: "Tool for copying websites",
                options: [
                    "A web browser",
                    "Tool to copy/download an entire website for offline analysis",
                    "An email program",
                    "A text editor"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "What is the function of Web Data Extractor?",
                category: "Website Recon Tools",
                difficulty: "medium",
                hint: "Extracting structured data",
                options: [
                    "Website design",
                    "Data encryption",
                    "Extract structured data (tables, links, emails)",
                    "Database creation"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What is the benefit of Email Tracking (like ReadNotify)?",
                category: "Website Recon Tools",
                difficulty: "medium",
                hint: "Knowing when email was opened",
                options: [
                    "Sending bulk emails",
                    "Encrypting emails",
                    "Detect when email is opened and sometimes IP/location (used in social engineering)",
                    "Deleting spam"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What is WHOIS?",
                category: "Domain Reconnaissance",
                difficulty: "easy",
                hint: "Tool for querying domain registration information",
                options: [
                    "A search engine",
                    "Query tool for domain registration records to find owner, registration dates, name servers",
                    "A web browser",
                    "An antivirus program"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "What information does WHOIS provide?",
                category: "Domain Reconnaissance",
                difficulty: "medium",
                hint: "Owner and registrar information",
                options: [
                    "Only IP address",
                    "Owner, registrar, registration/expiration dates, contact data",
                    "Only domain name",
                    "Only email"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "What is NsLookup?",
                category: "Domain Reconnaissance",
                difficulty: "medium",
                hint: "DNS query tool",
                options: [
                    "A backup tool",
                    "A task scheduler",
                    "Command-line tool used to query DNS system to get IP address for a domain",
                    "An image editor"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What is the Dig tool?",
                category: "Domain Reconnaissance",
                difficulty: "medium",
                hint: "Advanced DNS tool",
                options: [
                    "A digging tool",
                    "DNS tool used to query name servers for DNS records (A, MX, NS, TXT)",
                    "A video editing program",
                    "A file compression tool"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "What do DNS A records mean?",
                category: "Domain Reconnaissance",
                difficulty: "medium",
                hint: "Linking domain to IP address",
                options: [
                    "Email records",
                    "Text records",
                    "Records that link domain name to IPv4 address",
                    "Name server records"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What do MX records mean in DNS?",
                category: "Domain Reconnaissance",
                difficulty: "medium",
                hint: "Mail servers",
                options: [
                    "IP address records",
                    "Mail server records responsible for receiving email for the domain",
                    "Text records",
                    "Name server records"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "What is the benefit of the Ping command?",
                category: "Practical Tools",
                difficulty: "easy",
                hint: "Checking device availability",
                options: [
                    "Data encryption",
                    "File download",
                    "Identify if the target device is active (alive)",
                    "Software updates"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What does Ping measure with RTT?",
                category: "Practical Tools",
                difficulty: "medium",
                hint: "Response time",
                options: [
                    "Data size",
                    "Round Trip Time - packet round-trip time",
                    "Processor speed",
                    "Memory size"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "What is the Nmap tool?",
                category: "Practical Tools",
                difficulty: "medium",
                hint: "Famous network scanning tool",
                options: [
                    "A text editor",
                    "Tool to find open ports, discover running services, and identify operating systems",
                    "A web browser",
                    "An email program"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "In the practical experiment, what is the Registrar for google.com domain?",
                category: "Practical Part",
                difficulty: "medium",
                hint: "Domain registration company",
                options: [
                    "GoDaddy",
                    "Namecheap",
                    "MarkMonitor Inc.",
                    "CloudFlare"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "When was google.com domain created according to WHOIS records?",
                category: "Practical Part",
                difficulty: "hard",
                hint: "In the nineties",
                options: [
                    "2000-01-01",
                    "1995-06-20",
                    "1997-09-15",
                    "2005-12-10"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What is TTL in DNS context?",
                category: "Domain Reconnaissance",
                difficulty: "medium",
                hint: "Time To Live",
                options: [
                    "Total Transfer Limit",
                    "Time To Live - time the record remains valid in cache",
                    "Type Transfer Log",
                    "Terminal Text Length"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "Why is Google's TTL low (5 seconds)?",
                category: "Practical Part",
                difficulty: "hard",
                hint: "Frequent address changes",
                options: [
                    "To save costs",
                    "To speed up loading",
                    "Because Google frequently changes IP addresses for security and performance",
                    "Configuration error"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What are the basic commands used in the practical experiment?",
                category: "Practical Part",
                difficulty: "medium",
                hint: "Four reconnaissance tools",
                options: [
                    "ls, cd, pwd, mkdir",
                    "cat, grep, find, awk",
                    "Whois, Dig, Ping, Nmap",
                    "ssh, ftp, telnet, http"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What does NOERROR mean in Dig results?",
                category: "Practical Part",
                difficulty: "medium",
                hint: "Successful query",
                options: [
                    "An error occurred",
                    "Domain not found",
                    "Confirmation of successful DNS query",
                    "Domain expired"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What is the main mail server for google.com?",
                category: "Practical Part",
                difficulty: "medium",
                hint: "Starts with smtp",
                options: [
                    "mail.google.com",
                    "mx.google.com",
                    "smtp.google.com",
                    "email.google.com"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What does 0% Packet Loss indicate?",
                category: "Practical Part",
                difficulty: "medium",
                hint: "Connection stability",
                options: [
                    "The network is very slow",
                    "Fast and stable network connection",
                    "There's a configuration error",
                    "The network is disconnected"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "What does the command 'dig google.com A' mean?",
                category: "Domain Reconnaissance",
                difficulty: "medium",
                hint: "Query for IPv4 address",
                options: [
                    "Delete domain record",
                    "Update domain records",
                    "Query A record (IPv4 address) for google.com domain",
                    "Create new domain"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What does the command 'dig google.com MX' mean?",
                category: "Domain Reconnaissance",
                difficulty: "medium",
                hint: "Query for mail servers",
                options: [
                    "Scan domain",
                    "Query MX records (mail servers) for google.com domain",
                    "Encrypt mail",
                    "Delete mail"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "What is the importance of knowing Name Servers for a specific domain?",
                category: "Domain Reconnaissance",
                difficulty: "medium",
                hint: "Servers responsible for managing DNS",
                options: [
                    "To speed up the website",
                    "To know the servers responsible for managing DNS records for the domain",
                    "To improve security only",
                    "To increase traffic"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "What's the difference between Passive and Active Reconnaissance?",
                category: "Footprinting Basics",
                difficulty: "medium",
                hint: "Direct interaction",
                options: [
                    "Speed only",
                    "Passive gathers information without touching target, while active directly interacts with target",
                    "Cost only",
                    "Accuracy only"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "Why should Google Dorking be used ethically and legally?",
                category: "Google Hacking",
                difficulty: "medium",
                hint: "Legal and ethical aspect",
                options: [
                    "It's not necessary",
                    "Only for documentation",
                    "Because it's very powerful and can reveal sensitive information, so it must be used with permission and within the law",
                    "Only to save time"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What is the benefit of using Shodan filters like 'country:iq'?",
                category: "Shodan",
                difficulty: "medium",
                hint: "Geographically limiting results",
                options: [
                    "Speed up search",
                    "Improve accuracy only",
                    "Restrict search results to devices in Iraq",
                    "Encrypt results"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What does Shodan filter 'port:22' mean?",
                category: "Shodan",
                difficulty: "medium",
                hint: "SSH port",
                options: [
                    "Search for devices with HTTP port open",
                    "Search for devices with FTP port open",
                    "Search for devices with SSH (22) port open",
                    "Search for devices with SMTP port open"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What is the importance of curl and wget in website reconnaissance?",
                category: "Website Recon Tools",
                difficulty: "medium",
                hint: "Command-line tools for fetching data",
                options: [
                    "Only for web browsing",
                    "Only for file editing",
                    "Command-line programs to get data from the web, useful for quick downloads and checking website details",
                    "Only for data compression"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What is the benefit of Python + BeautifulSoup in website reconnaissance?",
                category: "Website Recon Tools",
                difficulty: "medium",
                hint: "HTML parsing and data extraction",
                options: [
                    "Website design only",
                    "Lightweight scripts to parse HTML and extract links, images, tables, and save results",
                    "Data encryption only",
                    "Database management only"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "What does the command 'whois google.com' show?",
                category: "Domain Reconnaissance",
                difficulty: "medium",
                hint: "Public domain registration information",
                options: [
                    "Only IP address",
                    "Public registration info: owner, registrar, dates, name servers, contact information",
                    "Only email",
                    "Only geographic location"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "What is the importance of Domain Status in WHOIS records?",
                category: "Domain Reconnaissance",
                difficulty: "hard",
                hint: "Domain status and protection settings",
                options: [
                    "Not important",
                    "Shows domain status and protection settings like transfer lock and updates",
                    "Only for decoration",
                    "Only for statistics"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "What does Initial TTL value of 128 in Ping command indicate?",
                category: "Practical Part",
                difficulty: "hard",
                hint: "Likely operating system",
                options: [
                    "Network speed",
                    "Usually indicates Windows operating system",
                    "Packet size",
                    "Number of servers"
                ],
                correct: 1
            },
            {
                lecture: "2",
                question: "What's the difference between Active and Passive Banner Grabbing?",
                category: "Advanced Concepts",
                difficulty: "hard",
                hint: "Sending requests vs monitoring network",
                options: [
                    "Speed only",
                    "Cost only",
                    "Active sends requests to service and analyzes response, while passive monitors traffic without sending requests",
                    "Accuracy only"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What is the importance of Reconnaissance in building a complete picture of the target?",
                category: "Footprinting Basics",
                difficulty: "medium",
                hint: "Prioritizing tests",
                options: [
                    "Not important",
                    "Only for documentation",
                    "Builds comprehensive picture of target to prioritize tests and improve defenses",
                    "Only to waste time"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "Why must authorization always be obtained before conducting Footprinting?",
                category: "Footprinting Basics",
                difficulty: "medium",
                hint: "Legal and ethical aspect",
                options: [
                    "Not necessary",
                    "Only for documentation",
                    "To follow laws and obtain formal authorization to avoid legal issues",
                    "Only to save time"
                ],
                correct: 2
            },
            {
                lecture: "2",
                question: "What information can be gathered in Passive Reconnaissance?",
                category: "Footprinting Basics",
                difficulty: "medium",
                hint: "Public information without interaction",
                options: [
                    "Only IP addresses",
                    "Only email",
                    "IPs & DNS, domain ownership, email, social profiles, web technologies",
                    "Only geographic location"
                ],
                correct: 2
            },
            {
                lecture: "3",
                question: "What is Information Gathering in the context of penetration testing?",
                category: "Information Gathering",
                difficulty: "easy",
                hint: "Collecting data about the target",
                options: [
                    "Software development",
                    "Collecting data about a person, company, website or system",
                    "Data encryption",
                    "Creating backups"
                ],
                correct: 1
            },
            {
                lecture: "3",
                question: "Why is Information Gathering the first step in penetration testing?",
                category: "Information Gathering",
                difficulty: "medium",
                hint: "More information increases success chances",
                options: [
                    "Because it's the easiest",
                    "Because collecting more information increases success chances later",
                    "Because it's the fastest",
                    "Because it's the cheapest"
                ],
                correct: 1
            },
            {
                lecture: "3",
                question: "What is Host Discovery?",
                category: "Host Discovery",
                difficulty: "medium",
                hint: "Identifying live systems on the network",
                options: [
                    "Creating new servers",
                    "Deleting old servers",
                    "Identifying live systems on target network before scanning and vulnerability assessment",
                    "Updating systems"
                ],
                correct: 2
            },
            {
                lecture: "3",
                question: "What does Host Discovery technique selection depend on?",
                category: "Host Discovery",
                difficulty: "medium",
                hint: "Topology and stealth requirements",
                options: [
                    "Price only",
                    "Network topology, stealth requirements, testing objectives",
                    "Speed only",
                    "Favorite color"
                ],
                correct: 1
            },
            {
                lecture: "3",
                question: "What is ICMP Ping (Ping Sweep)?",
                category: "Host Discovery Techniques",
                difficulty: "medium",
                hint: "Sending ICMP Echo requests",
                options: [
                    "An encryption technique",
                    "A type of firewall",
                    "Technique that sends ICMP Echo requests and waits for responses to identify live devices",
                    "An email protocol"
                ],
                correct: 2
            },
            {
                lecture: "3",
                question: "What are the features of ICMP Ping?",
                category: "Host Discovery Techniques",
                difficulty: "medium",
                hint: "Fast and supported but blockable",
                options: [
                    "Slow and ineffective",
                    "Very complex",
                    "Fast and widely supported, but often blocked by firewalls and easy to detect",
                    "Unreliable"
                ],
                correct: 2
            },
            {
                lecture: "3",
                question: "What is the command to perform ICMP Ping using Nmap?",
                category: "Host Discovery Techniques",
                difficulty: "medium",
                hint: "Using -sn and -PE",
                options: [
                    "nmap -sT 76.76.21.21",
                    "sudo nmap -sn -PE 76.76.21.21",
                    "nmap -sV 76.76.21.21",
                    "nmap -O 76.76.21.21"
                ],
                correct: 1
            },
            {
                lecture: "3",
                question: "What is ARP Scanning?",
                category: "Host Discovery Techniques",
                difficulty: "medium",
                hint: "Linking IP to MAC addresses",
                options: [
                    "Virus scanning",
                    "Sending ARP requests to link IP addresses to MAC addresses within local broadcast range",
                    "Data encryption",
                    "Creating new networks"
                ],
                correct: 1
            },
            {
                lecture: "3",
                question: "Why is ARP Scanning very effective on local networks (LANs)?",
                category: "Host Discovery Techniques",
                difficulty: "medium",
                hint: "ARP is essential for communication",
                options: [
                    "Because it's free",
                    "Because it's fast only",
                    "Because ARP is fundamental to communication within the local network",
                    "Because it's stealthy"
                ],
                correct: 2
            },
            {
                lecture: "3",
                question: "What is the limitation of ARP Scanning?",
                category: "Host Discovery Techniques",
                difficulty: "medium",
                hint: "Works only in same broadcast range",
                options: [
                    "Very slow",
                    "Works only within same broadcast range; detectable on network",
                    "Expensive",
                    "Requires special equipment"
                ],
                correct: 1
            },
            {
                lecture: "3",
                question: "What is Port Scanning?",
                category: "Port Scanning",
                difficulty: "medium",
                hint: "Discovering open ports and services",
                options: [
                    "Creating new ports",
                    "Closing ports",
                    "Technique to discover open ports and services on a target device",
                    "Encrypting ports"
                ],
                correct: 2
            },
            {
                lecture: "3",
                question: "Where is Port Scanning used?",
                category: "Port Scanning",
                difficulty: "medium",
                hint: "Cybersecurity and network management",
                options: [
                    "Only in gaming",
                    "Only in graphic design",
                    "In cybersecurity (penetration testing, vulnerability assessment) and network management",
                    "Only in website development"
                ],
                correct: 2
            },
            {
                lecture: "3",
                question: "How does Port Scanning work?",
                category: "Port Scanning",
                difficulty: "medium",
                hint: "Sending packets and analyzing responses",
                options: [
                    "By opening all ports",
                    "By encrypting data",
                    "By sending packets to ports and analyzing responses (open, closed, or filtered)",
                    "By deleting files"
                ],
                correct: 2
            },
            {
                lecture: "3",
                question: "What is SYN Scan (-sS)?",
                category: "Port Scanning Types",
                difficulty: "medium",
                hint: "Stealth and fast scan",
                options: [
                    "Slow and obvious scan",
                    "Comprehensive system scan",
                    "Stealth and fast scan using SYN packets",
                    "Virus scan"
                ],
                correct: 2
            },
            {
                lecture: "3",
                question: "What does the -sV option do in Nmap?",
                category: "Port Scanning Types",
                difficulty: "medium",
                hint: "Service and version detection",
                options: [
                    "Virus scanning",
                    "Service and version detection",
                    "File deletion",
                    "Data encryption"
                ],
                correct: 1
            },
            {
                lecture: "3",
                question: "What does the -p- option mean in Nmap?",
                category: "Port Scanning Types",
                difficulty: "medium",
                hint: "Scan all ports",
                options: [
                    "Scan common ports only",
                    "Scan all ports (1-65535)",
                    "Scan one port",
                    "Skip scanning"
                ],
                correct: 1
            },
            {
                lecture: "3",
                question: "What is Banner Grabbing?",
                category: "Banner Grabbing",
                difficulty: "medium",
                hint: "Collecting information from network services",
                options: [
                    "Stealing banners",
                    "Designing banners",
                    "Technique to collect information from network services by capturing the banner message sent by servers",
                    "Printing posters"
                ],
                correct: 2
            },
            {
                lecture: "3",
                question: "What is a Banner in networking context?",
                category: "Banner Grabbing",
                difficulty: "medium",
                hint: "Message from server upon connection",
                options: [
                    "A commercial advertisement",
                    "A decorative image",
                    "A message sent by servers when establishing a connection, including software and OS information",
                    "A text file"
                ],
                correct: 2
            },
            {
                lecture: "3",
                question: "What is Nessus?",
                category: "Vulnerability Scanning",
                difficulty: "medium",
                hint: "Vulnerability scanner from Tenable",
                options: [
                    "An operating system",
                    "A programming language",
                    "A vulnerability scanner from Tenable, Inc. that detects security weaknesses but doesn't exploit them",
                    "A web browser"
                ],
                correct: 2
            },
            {
                lecture: "3",
                question: "What does Nessus detect?",
                category: "Vulnerability Scanning",
                difficulty: "medium",
                hint: "Vulnerabilities and configuration errors",
                options: [
                    "Only viruses",
                    "Vulnerabilities (like outdated software and missing patches), configuration errors, compliance issues, malware, and sensitive data exposure",
                    "Only code errors",
                    "Only performance issues"
                ],
                correct: 1
            },
            {
                lecture: "3",
                question: "What types of vulnerabilities does Nessus detect?",
                category: "Vulnerability Scanning",
                difficulty: "medium",
                hint: "Outdated software and missing patches",
                options: [
                    "Only web vulnerabilities",
                    "Outdated software, missing security patches, weak passwords, open ports",
                    "Only database vulnerabilities",
                    "Only network vulnerabilities"
                ],
                correct: 1
            }
        ],
    'Cryptography': [
        {
            lecture: '1',
            question: 'What is the primary goal of cryptography?',
            category: 'Cryptography Basics',
            difficulty: 'easy',
            hint: 'Think about protecting information.',
            options: ['To compress data', 'To secure communication and protect data', 'To speed up transmission', 'To organize files'],
            correct: 1
        },
        {
            lecture: '2',
            question: 'In symmetric encryption, what is used for both encryption and decryption?',
            category: 'Encryption Methods',
            difficulty: 'medium',
            hint: 'Consider what makes symmetric encryption different from asymmetric.',
            options: ['Two different keys', 'The same key', 'No key is needed', 'A hash function'],
            correct: 1
        },
        {
            lecture: '1',
            question: 'Which algorithm is an example of asymmetric encryption?',
            category: 'Encryption Algorithms',
            difficulty: 'medium',
            hint: 'This algorithm uses public and private keys.',
            options: ['AES', 'DES', 'RSA', '3DES'],
            correct: 2
        },
        {
            lecture: '3',
            question: 'What is a hash function used for?',
            category: 'Hash Functions',
            difficulty: 'easy',
            hint: 'It creates a fixed-size output from any input.',
            options: ['Encrypting data', 'Creating digital signatures', 'Compressing files', 'Network routing'],
            correct: 1
        },
        {
            lecture: '2',
            question: 'What does SSL/TLS provide?',
            category: 'Network Security',
            difficulty: 'medium',
            hint: 'Used for secure web browsing.',
            options: ['File compression', 'Secure communication over networks', 'Database encryption', 'Password storage'],
            correct: 1
        }
    ],
    'Computer Networks': [
        {
            lecture: '1',
            question: 'Which layer of the OSI model is responsible for routing?',
            category: 'OSI Model',
            difficulty: 'medium',
            hint: 'This layer deals with IP addresses.',
            options: ['Transport Layer', 'Network Layer', 'Data Link Layer', 'Physical Layer'],
            correct: 1
        },
        {
            lecture: '1',
            question: 'What protocol is used for email transmission?',
            category: 'Application Protocols',
            difficulty: 'easy',
            hint: 'Simple Mail Transfer Protocol.',
            options: ['HTTP', 'FTP', 'SMTP', 'DNS'],
            correct: 2
        },
        {
            lecture: '2',
            question: 'What is the purpose of a subnet mask?',
            category: 'IP Addressing',
            difficulty: 'medium',
            hint: 'It divides IP addresses into network and host portions.',
            options: ['Encrypt data', 'Define network boundaries', 'Speed up routing', 'Compress packets'],
            correct: 1
        },
        {
            lecture: '3',
            question: 'Which device operates at the Data Link Layer?',
            category: 'Network Devices',
            difficulty: 'hard',
            hint: 'It uses MAC addresses for forwarding.',
            options: ['Router', 'Switch', 'Hub', 'Modem'],
            correct: 1
        },
        {
            lecture: '2',
            question: 'What does TCP provide that UDP does not?',
            category: 'Transport Protocols',
            difficulty: 'medium',
            hint: 'Think about reliability.',
            options: ['Faster transmission', 'Reliable, ordered delivery', 'Lower overhead', 'Broadcasting'],
            correct: 1
        }
    ],
    'Database Systems': [
        {
            lecture: '1',
            question: 'What does ACID stand for in database transactions?',
            category: 'Transaction Properties',
            difficulty: 'medium',
            hint: 'These are the four key properties of database transactions.',
            options: ['Atomic, Consistent, Isolated, Durable', 'Advanced, Complex, Integrated, Distributed', 'Automated, Controlled, Independent, Dynamic', 'Active, Coherent, Indexed, Distinct'],
            correct: 0
        },
        {
            lecture: '2',
            question: 'What is a primary key?',
            category: 'Database Design',
            difficulty: 'easy',
            hint: 'It uniquely identifies each record.',
            options: ['A duplicate field', 'A unique identifier for each row', 'An optional field', 'A foreign reference'],
            correct: 1
        },
        {
            lecture: '1',
            question: 'What is normalization in databases?',
            category: 'Database Design',
            difficulty: 'hard',
            hint: 'It reduces redundancy and improves data integrity.',
            options: ['Adding more tables', 'Organizing data to reduce redundancy', 'Encrypting data', 'Backing up data'],
            correct: 1
        },
        {
            lecture: '3',
            question: 'Which SQL command is used to retrieve data?',
            category: 'SQL',
            difficulty: 'easy',
            hint: 'This is the most common query command.',
            options: ['INSERT', 'UPDATE', 'SELECT', 'DELETE'],
            correct: 2
        },
        {
            lecture: '2',
            question: 'What is an index in a database?',
            category: 'Performance',
            difficulty: 'medium',
            hint: 'It speeds up data retrieval operations.',
            options: ['A backup copy', 'A data structure for faster searches', 'A type of key', 'A query result'],
            correct: 1
        }
    ],
    'Software Engineering': [
        {
            lecture: '1',
            question: 'What is the Waterfall model?',
            category: 'Development Models',
            difficulty: 'easy',
            hint: 'It follows a sequential approach.',
            options: ['An iterative model', 'A sequential development model', 'An agile framework', 'A testing methodology'],
            correct: 1
        },
        {
            lecture: '2',
            question: 'What does Agile methodology emphasize?',
            category: 'Agile',
            difficulty: 'medium',
            hint: 'Think about flexibility and customer collaboration.',
            options: ['Extensive documentation', 'Iterative development and customer feedback', 'Strict planning', 'Individual work'],
            correct: 1
        },
        {
            lecture: '1',
            question: 'What is the purpose of version control?',
            category: 'Tools',
            difficulty: 'easy',
            hint: 'Git is a popular example.',
            options: ['Testing code', 'Tracking changes in code', 'Compiling programs', 'Debugging'],
            correct: 1
        },
        {
            lecture: '3',
            question: 'What is unit testing?',
            category: 'Testing',
            difficulty: 'medium',
            hint: 'It tests individual components.',
            options: ['Testing the entire system', 'Testing individual units or components', 'User acceptance testing', 'Integration testing'],
            correct: 1
        },
        {
            lecture: '2',
            question: 'What does UML stand for?',
            category: 'Design',
            difficulty: 'easy',
            hint: 'Used for modeling software systems.',
            options: ['Universal Markup Language', 'Unified Modeling Language', 'User Management Logic', 'Ultimate Method Library'],
            correct: 1
        }
    ],
    'Artificial Intelligence': [
        {
            lecture: '1',
            question: 'What is machine learning?',
            category: 'ML Basics',
            difficulty: 'easy',
            hint: 'Systems that learn from data.',
            options: ['Programming with machines', 'Algorithms that learn from data', 'Hardware optimization', 'Network protocols'],
            correct: 1
        },
        {
            lecture: '2',
            question: 'What is a neural network inspired by?',
            category: 'Neural Networks',
            difficulty: 'medium',
            hint: 'It mimics biological structures.',
            options: ['Computer circuits', 'The human brain', 'Network topology', 'Database structures'],
            correct: 1
        },
        {
            lecture: '1',
            question: 'What is supervised learning?',
            category: 'Learning Types',
            difficulty: 'medium',
            hint: 'Training with labeled data.',
            options: ['Learning without labels', 'Learning from labeled training data', 'Reinforcement learning', 'Unsupervised clustering'],
            correct: 1
        },
        {
            lecture: '3',
            question: 'What does NLP stand for?',
            category: 'AI Applications',
            difficulty: 'easy',
            hint: 'Processing human language.',
            options: ['Network Layer Protocol', 'Natural Language Processing', 'Neural Learning Process', 'New Logic Programming'],
            correct: 1
        },
        {
            lecture: '2',
            question: 'What is overfitting in machine learning?',
            category: 'Model Training',
            difficulty: 'hard',
            hint: 'When a model learns the training data too well.',
            options: ['Model performs poorly on training data', 'Model performs well only on training data', 'Model is too simple', 'Model trains too slowly'],
            correct: 1
        }
    ]
};

// Generate additional questions to reach 50
function generateQuestionsForSubject(subjectNameEn) {
    const baseQuestions = questionsBank[subjectNameEn] || [];
    const questions = [...baseQuestions];

    // Generate more questions if needed
    while (questions.length < 50) {
        const base = baseQuestions[questions.length % baseQuestions.length];
        const newQuestion = {
            ...base,
            lecture: String(Math.floor(Math.random() * 5) + 1),
            question: base.question + ' (Variant ' + (Math.floor(questions.length / baseQuestions.length) + 1) + ')',
            difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)]
        };
        questions.push(newQuestion);
    }

    // Shuffle questions
    return shuffleArray(questions.slice(0, 50));
}


// Render subject cards
function renderSubjects() {
    const grid = document.getElementById('subjectsGrid');
    grid.innerHTML = subjects.map((subject, index) => `
        <div class="subject-card" onclick="selectSubject(${index})" style="animation-delay: ${index * 0.1}s">
            <div class="subject-icon">
                <i class="fas ${subject.icon}"></i>
            </div>
            <h3>${subject.name}</h3>
            <p>${subject.nameEn}</p>
        </div>
    `).join('');
}

// Setup event listeners
function setupEventListeners() {
    const pdfInput = document.getElementById('pdfInput');
    const uploadArea = document.getElementById('uploadArea');
    
    // PDF input change
    pdfInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#7c3aed';
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#1e3a8a';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#1e3a8a';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect({ target: { files } });
        }
    });
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSelected').style.display = 'flex';
        showToast('تم اختيار الملف بنجاح!');
    } else {
        showToast('الرجاء اختيار ملف PDF', 'error');
    }
}

// Select subject
function selectSubject(index) {
    appState.currentSubject = subjects[index];
    appState.previousPage = 'homePage';
    showLecturesPage();
}

// Show lectures selection page
function showLecturesPage() {
    const subject = appState.currentSubject;
    
    // Update header
    document.getElementById('lecturesSubjectIcon').innerHTML = `<i class="fas ${subject.icon}"></i>`;
    document.getElementById('lecturesSubjectTitle').textContent = subject.name;
    document.getElementById('lecturesSubjectDesc').textContent = subject.description;
    
    // Calculate stats
    const totalLectures = subject.lectures.length;
    let completedLectures = 0;
    let totalScore = 0;
    let totalAttempts = 0;
    
    subject.lectures.forEach(lecture => {
        const lectureKey = `${subject.id}_${lecture.id}`;
        const progress = storageDB.get('lectureProgress')[lectureKey];
        if (progress && progress.length > 0) {
            completedLectures++;
            const avgScore = progress.reduce((sum, p) => sum + p.percentage, 0) / progress.length;
            totalScore += avgScore;
            totalAttempts++;
        }
    });
    
    const avgScore = totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0;
    
    document.getElementById('totalLectures').textContent = totalLectures;
    document.getElementById('completedLectures').textContent = completedLectures;
    document.getElementById('avgScore').textContent = avgScore + '%';
    
    // Render lecture cards
    renderLectureCards();
    
    showPage('lecturesPage');
}

// Render lecture cards
function renderLectureCards() {
    const subject = appState.currentSubject;
    const grid = document.getElementById('lecturesGrid');
    
    grid.innerHTML = subject.lectures.map((lecture, index) => {
        const lectureKey = `${subject.id}_${lecture.id}`;
        const progress = storageDB.get('lectureProgress')[lectureKey];
        
        let stars = 0;
        let progressPercent = 0;
        let completed = false;
        
        if (progress && progress.length > 0) {
            const lastAttempt = progress[progress.length - 1];
            progressPercent = lastAttempt.percentage;
            completed = true;
            
            // Calculate stars based on score
            if (progressPercent >= 90) stars = 5;
            else if (progressPercent >= 80) stars = 4;
            else if (progressPercent >= 70) stars = 3;
            else if (progressPercent >= 60) stars = 2;
            else if (progressPercent >= 50) stars = 1;
        }
        
        return `
            <div class="lecture-card ${completed ? 'completed' : ''}" onclick="startLecture(${lecture.id})" style="animation-delay: ${index * 0.05}s">
                <div class="lecture-header">
                    <div class="lecture-number">محاضرة ${lecture.id}</div>
                    <div class="lecture-status">
                        ${[1, 2, 3, 4, 5].map(i => `
                            <i class="fas fa-star star ${i <= stars ? 'filled' : ''}"></i>
                        `).join('')}
                    </div>
                </div>
                
                <h3 class="lecture-title">${lecture.title}</h3>
                
                <div class="lecture-meta">
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        ${lecture.duration}
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-question-circle"></i>
                        ${lecture.questionCount} سؤال
                    </div>
                </div>
                
                <div class="lecture-topics">
                    ${lecture.topics.slice(0, 3).map(topic => `
                        <span class="topic-tag">${topic}</span>
                    `).join('')}
                </div>
                
                ${completed ? `
                    <div class="lecture-progress">
                        <div class="progress-bar-mini">
                            <div class="progress-fill-mini" style="width: ${progressPercent}%"></div>
                        </div>
                        <span class="progress-text">${progressPercent}%</span>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Start individual lecture
function startLecture(lectureId) {
    const lecture = appState.currentSubject.lectures.find(l => l.id === lectureId);
    appState.currentLecture = lecture;
    appState.previousPage = 'lecturesPage';
    
    // Generate questions for this specific lecture
    const allQuestions = generateQuestionsForSubject(appState.currentSubject.nameEn);
    appState.questions = allQuestions.filter(q => q.lecture === String(lectureId)).slice(0, lecture.questionCount);
    
    if (appState.questions.length === 0) {
        // Fallback: use any questions
        appState.questions = allQuestions.slice(0, lecture.questionCount);
    }
    
    startQuizInterface();
}

// Start all lectures combined
function startAllLectures() {
    appState.currentLecture = {
        id: 'all',
        title: 'جميع المحاضرات',
        questionCount: 50
    };
    appState.previousPage = 'lecturesPage';
    
    // Generate questions from all lectures
    appState.questions = generateQuestionsForSubject(appState.currentSubject.nameEn);
    
    startQuizInterface();
}

// Start quiz interface (refactored)
function startQuizInterface() {
    appState.currentQuestionIndex = 0;
    appState.userAnswers = new Array(appState.questions.length).fill(null);
    appState.bookmarkedQuestions = [];
    appState.startTime = Date.now();
    appState.feedbackShown = false;
    saveAppState();
    
    // Update header
    document.getElementById('currentSubjectTitle').textContent = appState.currentSubject.name;
    document.getElementById('currentLectureTitle').textContent = appState.currentLecture.title;
    document.getElementById('breadcrumbSubject').textContent = appState.currentSubject.name;
    document.getElementById('breadcrumbLecture').textContent = appState.currentLecture.title;
    
    // Start timer
    startTimer();
    
    // Show quiz interface
    showPage('quizPage');
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('quizInterface').style.display = 'block';
    
    // Render question navigator
    renderNavigator();
    
    // Show first question
    showQuestion(0);
    
    showToast('بدأ الاختبار! حظ موفق 🎯');
}

// Use sample questions
function useSampleQuestions() {
    showLoadingOverlay(true);
    
    setTimeout(() => {
        generateQuiz(true);
        showLoadingOverlay(false);
    }, 1500);
}

// Generate quiz
function generateQuiz(useSample = false) {
    if (!useSample && !document.getElementById('fileSelected').style.display) {
        showToast('الرجاء اختيار ملف PDF أولاً', 'error');
        return;
    }
    
    showLoadingOverlay(true);
    
    setTimeout(() => {
        // Generate questions for the current subject
        appState.questions = generateQuestionsForSubject(appState.currentSubject.nameEn);
        appState.currentQuestionIndex = 0;
        appState.userAnswers = new Array(50).fill(null);
        appState.startTime = Date.now();
        appState.feedbackShown = false;
        
        // Start timer
        startTimer();
        
        // Show quiz interface
        document.getElementById('uploadSection').style.display = 'none';
        document.getElementById('quizInterface').style.display = 'block';
        
        // Render question navigator
        renderNavigator();
        
        // Show first question
        showQuestion(0);
        
        showLoadingOverlay(false);
        showToast('تم توليد 50 سؤالاً بنجاح!');
    }, 2000);
}

// Start timer
function startTimer() {
    if (appState.timerInterval) {
        clearInterval(appState.timerInterval);
    }
    
    appState.timerInterval = setInterval(() => {
        const elapsed = Date.now() - appState.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const timeText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        const timeElapsed = document.getElementById('timeElapsed');
        if (timeElapsed) {
            timeElapsed.textContent = `الوقت: ${timeText}`;
        }
        
        const headerTime = document.getElementById('headerTime');
        if (headerTime) {
            headerTime.textContent = timeText;
        }
    }, 1000);
}

// Render question navigator
function renderNavigator() {
    const grid = document.getElementById('navigatorGrid');
    const totalQuestions = appState.questions.length;
    grid.innerHTML = Array.from({ length: totalQuestions }, (_, i) => `
        <div class="nav-number ${i === 0 ? 'current' : ''}" onclick="showQuestion(${i})">
            ${i + 1}
        </div>
    `).join('');
}

// Show question
function showQuestion(index) {
    saveAppState();

    appState.currentQuestionIndex = index;
    const question = appState.questions[index];
    const totalQuestions = appState.questions.length;
    
    // Update progress
    const progressPercent = Math.round(((index + 1) / totalQuestions) * 100);
    document.getElementById('progressText').textContent = `السؤال ${index + 1} من ${totalQuestions}`;
    document.getElementById('progressFill').style.width = `${progressPercent}%`;
    
    // Update header progress
    const headerProgress = document.getElementById('headerProgress');
    if (headerProgress) {
        headerProgress.textContent = progressPercent + '%';
    }
    
    const progressCircle = document.getElementById('headerProgressCircle');
    if (progressCircle) {
        const circumference = 2 * Math.PI * 45;
        const offset = circumference - (progressPercent / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;
    }
    
    // Update question card
    document.getElementById('lectureBadge').textContent = `المحاضرة ${question.lecture}`;
    
    const difficultyBadge = document.getElementById('difficultyBadge');
    difficultyBadge.textContent = question.difficulty === 'easy' ? 'سهل' : 
                                   question.difficulty === 'medium' ? 'متوسط' : 'صعب';
    difficultyBadge.className = `difficulty-badge ${question.difficulty}`;
    
    document.getElementById('questionText').textContent = question.question;
    document.getElementById('categoryTag').textContent = question.category;
    document.getElementById('hintText').textContent = question.hint;
    document.getElementById('hintBox').style.display = 'none';
    
    // Update bookmark button
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    if (appState.bookmarkedQuestions.includes(index)) {
        bookmarkBtn.classList.add('active');
        bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i> تمت الإضافة';
    } else {
        bookmarkBtn.classList.remove('active');
        bookmarkBtn.innerHTML = '<i class="far fa-bookmark"></i> حفظ للمراجعة';
    }
    
    // Render options
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = question.options.map((option, i) => `
        <button class="option-btn ${appState.userAnswers[index] === i ? 'selected' : ''}" 
                onclick="selectAnswer(${i})" id="option-${i}">
            <span class="option-letter">${String.fromCharCode(65 + i)}</span>
            <span>${option}</span>
        </button>
    `).join('');
    
    // Reset feedback state
    appState.feedbackShown = false;
    
    // Update navigation buttons
    const lastIndex = totalQuestions - 1;
    document.getElementById('prevBtn').disabled = index === 0;
    document.getElementById('nextBtn').style.display = index === lastIndex ? 'none' : 'inline-flex';
    document.getElementById('submitBtn').style.display = index === lastIndex ? 'inline-flex' : 'none';
    
    // Update navigator
    updateNavigator();
    
    // Scroll to question card smoothly
    setTimeout(() => {
        const questionCard = document.getElementById('questionCard');
        if (questionCard) {
            questionCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

// Update navigator
function updateNavigator() {
    const navNumbers = document.querySelectorAll('.nav-number');
    navNumbers.forEach((nav, i) => {
        nav.className = 'nav-number';
        if (i === appState.currentQuestionIndex) {
            nav.classList.add('current');
        }
        if (appState.userAnswers[i] !== null) {
            nav.classList.add('answered');
        }
    });
}


// Show instant feedback button
function showInstantFeedbackButton(optionIndex) {
    // Remove any existing feedback button
    const existingBtn = document.querySelector('.instant-feedback-btn');
    if (existingBtn) existingBtn.remove();
    
    // Create and show new feedback button
    const selectedOption = document.getElementById(`option-${optionIndex}`);
    if (selectedOption) {
        const feedbackBtn = document.createElement('button');
        feedbackBtn.className = 'instant-feedback-btn';
        feedbackBtn.innerHTML = '<i class="fas fa-check"></i> تحقق من الإجابة';
        feedbackBtn.onclick = (e) => {
            e.stopPropagation();
            showFeedbackAndAdvance();
        };
        selectedOption.style.position = 'relative';
        selectedOption.appendChild(feedbackBtn);
    }
}

// Show feedback and auto-advance
function showFeedbackAndAdvance() {
    appState.feedbackShown = true;
    
    const currentIndex = appState.currentQuestionIndex;
    const question = appState.questions[currentIndex];
    const userAnswer = appState.userAnswers[currentIndex];
    const correctAnswer = question.correct;
    
    // Remove feedback button
    const feedbackBtn = document.querySelector('.instant-feedback-btn');
    if (feedbackBtn) feedbackBtn.remove();
    
    // Show visual feedback
    const options = document.querySelectorAll('.option-btn');
    options.forEach((opt, i) => {
        opt.style.pointerEvents = 'none'; // Disable clicking during feedback
        
        if (i === userAnswer) {
            if (i === correctAnswer) {
                opt.classList.add('correct-feedback');
                opt.innerHTML += ' <i class="fas fa-check-circle" style="color: var(--success); margin-right: 8px;"></i>';
            } else {
                opt.classList.add('incorrect-feedback');
                opt.innerHTML += ' <i class="fas fa-times-circle" style="color: var(--error); margin-right: 8px;"></i>';
            }
        }
        
        // Always highlight the correct answer
        if (i === correctAnswer && i !== userAnswer) {
            opt.classList.add('correct-feedback');
            opt.innerHTML += ' <i class="fas fa-check-circle" style="color: var(--success); margin-right: 8px;"></i>';
        }
    });
    
    // Auto-advance after 1.5 seconds
    setTimeout(() => {
        const totalQuestions = appState.questions.length;
        if (currentIndex < totalQuestions - 1) {
            nextQuestion();
        } else {
            // Last question - show submit button or auto-submit
            showToast('انتهيت من جميع الأسئلة!');
        }
    }, 1500);
}



// Toggle hint
function toggleHint() {
    const hintBox = document.getElementById('hintBox');
    const isVisible = hintBox.style.display === 'flex';
    hintBox.style.display = isVisible ? 'none' : 'flex';
    document.getElementById('hintBtn').innerHTML = isVisible ? 
        '<i class="fas fa-lightbulb"></i> عرض التلميح' : 
        '<i class="fas fa-lightbulb"></i> إخفاء التلميح';
}

// Previous question
function previousQuestion() {
    if (appState.currentQuestionIndex > 0) {
        showQuestion(appState.currentQuestionIndex - 1);
    }
}

// Next question
function nextQuestion() {
    if (appState.currentQuestionIndex < 49) {
        showQuestion(appState.currentQuestionIndex + 1);
    }
}

// Submit quiz
function submitQuiz() {
    const unanswered = appState.userAnswers.filter(a => a === null).length;
    
    if (unanswered > 0) {
        const confirm = window.confirm(`لم تجب على ${unanswered} سؤالاً. هل تريد إنهاء الاختبار؟`);
        if (!confirm) return;
    }
    
    // Stop timer
    if (appState.timerInterval) {
        clearInterval(appState.timerInterval);
    }
    
    // Calculate results
    calculateResults();
    
    // Show results page
    showPage('resultsPage');
}

// Calculate results
function calculateResults() {
    let correct = 0;
    const totalQuestions = appState.questions.length;
    
    appState.questions.forEach((question, i) => {
        if (appState.userAnswers[i] === question.correct) {
            correct++;
        }
    });
    
    const percentage = Math.round((correct / totalQuestions) * 100);
    const incorrect = totalQuestions - correct;
    
    // Calculate time spent
    const timeSpent = Math.round((Date.now() - appState.startTime) / 1000);
    
    // Save to storage
    storageDB.updateStats(
        appState.currentSubject.id,
        appState.currentLecture.id,
        correct,
        totalQuestions,
        timeSpent
    );
    
    // Update results display
    document.getElementById('scorePercentage').textContent = `${percentage}%`;
    document.getElementById('correctCount').textContent = correct;
    document.getElementById('incorrectCount').textContent = incorrect;
    
    // Update header score
    const headerScore = document.getElementById('headerScore');
    if (headerScore) {
        headerScore.textContent = correct;
    }
    
    // Animate score circle
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (percentage / 100) * circumference;
    
    // Add gradient definition to SVG
    const svg = document.querySelector('.score-svg');
    if (!svg.querySelector('defs')) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.setAttribute('id', 'scoreGradient');
        gradient.innerHTML = `
            <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
        `;
        defs.appendChild(gradient);
        svg.appendChild(defs);
    }
    
    setTimeout(() => {
        document.getElementById('scoreProgress').style.strokeDashoffset = offset;
    }, 500);
    
    // Render review
    renderReview(correct);
}

// Render review
function renderReview(correctCount) {
    const container = document.getElementById('reviewContainer');
    
    container.innerHTML = appState.questions.map((question, i) => {
        const userAnswer = appState.userAnswers[i];
        const isCorrect = userAnswer === question.correct;
        
        return `
            <div class="review-item ${isCorrect ? 'correct' : 'incorrect'}">
                <div class="review-number">السؤال ${i + 1}</div>
                <div class="review-question">${question.question}</div>
                ${userAnswer !== null ? `
                    <div class="review-answer user ${isCorrect ? 'correct-answer' : ''}">
                        <strong>إجابتك:</strong> ${String.fromCharCode(65 + userAnswer)}) ${question.options[userAnswer]}
                    </div>
                ` : '<div class="review-answer user"><strong>لم تجب على هذا السؤال</strong></div>'}
                <div class="review-answer correct-ans">
                    <strong>الإجابة الصحيحة:</strong> ${String.fromCharCode(65 + question.correct)}) ${question.options[question.correct]}
                </div>
            </div>
        `;
    }).join('');
}

// Retry quiz
function retryQuiz() {
    appState.userAnswers = new Array(appState.questions.length).fill(null);
    appState.currentQuestionIndex = 0;
    appState.startTime = Date.now();
    appState.feedbackShown = false;
    
    // Shuffle questions again
    appState.questions = shuffleArray(appState.questions);
    
    startTimer();
    renderNavigator();
    showQuestion(0);
    showPage('quizPage');
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('quizInterface').style.display = 'block';
}

// Go back
function goBack() {
    if (appState.previousPage === 'lecturesPage') {
        showLecturesPage();
    } else {
        goToHome();
    }
}

// Go to home
function goToHome() {
    if (appState.timerInterval) {
        clearInterval(appState.timerInterval);
    }
    
    // Reset state
    appState = {
        currentSubject: null,
        currentLecture: null,
        questions: [],
        currentQuestionIndex: 0,
        userAnswers: [],
        bookmarkedQuestions: [],
        startTime: null,
        timerInterval: null,
        previousPage: null,
        feedbackShown: false
    };
    
    showPage('homePage');
}

// Show analytics dashboard
function showAnalytics() {
    appState.previousPage = 'lecturesPage';
    
    // Update analytics data
    document.getElementById('totalQuizzesTaken').textContent = storageDB.get('totalQuizzes');
    document.getElementById('totalCorrectAnswers').textContent = storageDB.get('totalCorrect');
    
    const totalQuestions = storageDB.get('totalQuestions');
    const totalCorrect = storageDB.get('totalCorrect');
    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    document.getElementById('overallAccuracy').textContent = accuracy + '%';
    document.getElementById('studyStreak').textContent = storageDB.get('studyStreak');
    
    // Render achievements
    renderAchievements();
    
    // Render subject performance
    renderSubjectPerformance();
    
    showPage('analyticsPage');
}

// Render achievements
function renderAchievements() {
    const achievementsList = [
        { id: 'first_quiz', name: 'البداية', description: 'أكمل أول اختبار', icon: '🏆' },
        { id: 'perfect_score', name: 'درجة كاملة', description: 'احصل على 100% في اختبار', icon: '🌟' },
        { id: 'streak_7', name: 'أسبوع متواصل', description: 'ادرس لمدة 7 أيام متتالية', icon: '🔥' },
        { id: 'quiz_master', name: 'خبير الاختبارات', description: 'أكمل 10 اختبارات', icon: '👑' },
        { id: 'century', name: 'المئة', description: 'أجب على 100 سؤال بشكل صحيح', icon: '💯' }
    ];
    
    const grid = document.getElementById('achievementsGrid');
    const unlockedAchievements = storageDB.get('achievements');
    
    grid.innerHTML = achievementsList.map(achievement => `
        <div class="achievement-badge ${unlockedAchievements.includes(achievement.id) ? 'unlocked' : 'locked'}">
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-desc">${achievement.description}</div>
        </div>
    `).join('');
}

// Render subject performance
function renderSubjectPerformance() {
    const container = document.getElementById('subjectPerformanceList');
    const subjectStats = storageDB.get('subjectStats');
    
    const performanceHTML = subjects.map(subject => {
        const stats = subjectStats[subject.id];
        if (!stats || stats.totalQuizzes === 0) {
            return `
                <div class="performance-card">
                    <div class="performance-icon">
                        <i class="fas ${subject.icon}"></i>
                    </div>
                    <div class="performance-details">
                        <div class="performance-subject">${subject.name}</div>
                        <div class="performance-stats">
                            <span>لم يتم البدء بعد</span>
                        </div>
                    </div>
                    <div class="performance-score">-</div>
                </div>
            `;
        }
        
        const avgScore = Math.round((stats.totalScore / stats.totalQuestions) * 100);
        
        return `
            <div class="performance-card">
                <div class="performance-icon">
                    <i class="fas ${subject.icon}"></i>
                </div>
                <div class="performance-details">
                    <div class="performance-subject">${subject.name}</div>
                    <div class="performance-stats">
                        <span>${stats.totalQuizzes} اختبار</span>
                        <span>أفضل نتيجة: ${stats.bestScore}%</span>
                    </div>
                </div>
                <div class="performance-score">${avgScore}%</div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = performanceHTML;
}



// Pause quiz
function pauseQuiz() {
    if (appState.timerInterval) {
        clearInterval(appState.timerInterval);
        appState.timerInterval = null;
        showToast('تم إيقاف الاختبار مؤقتاً');
    } else {
        startTimer();
        showToast('تم استئناف الاختبار');
    }
}


// Show page
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}



// Show loading overlay
function showLoadingOverlay(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

// Utility: Shuffle array
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}





// Save app state to localStorage
function saveAppState() {
    try {
        const stateToSave = {
            currentSubject: appState.currentSubject,
            currentLecture: appState.currentLecture,
            questions: appState.questions,
            currentQuestionIndex: appState.currentQuestionIndex,
            userAnswers: appState.userAnswers,
            bookmarkedQuestions: appState.bookmarkedQuestions,
            startTime: appState.startTime,
            previousPage: appState.previousPage,
            feedbackShown: appState.feedbackShown
        };
        localStorage.setItem('quizAppState', JSON.stringify(stateToSave));
    } catch (error) {
        console.error('Error saving app state:', error);
    }
}

// Load app state from localStorage
function loadAppState() {
    try {
        const saved = localStorage.getItem('quizAppState');
        if (saved) {
            const parsed = JSON.parse(saved);
            
            // Restore basic state
            appState.currentSubject = parsed.currentSubject;
            appState.currentLecture = parsed.currentLecture;
            appState.questions = parsed.questions || [];
            appState.currentQuestionIndex = parsed.currentQuestionIndex || 0;
            appState.userAnswers = parsed.userAnswers || [];
            appState.bookmarkedQuestions = parsed.bookmarkedQuestions || [];
            appState.previousPage = parsed.previousPage;
            appState.feedbackShown = parsed.feedbackShown || false;
            
            // Handle startTime - if it exists and quiz was in progress, recalculate elapsed time
            if (parsed.startTime && parsed.questions && parsed.questions.length > 0) {
                const elapsed = Date.now() - new Date(parsed.startTime).getTime();
                // Only restore if quiz was started less than 24 hours ago
                if (elapsed < 24 * 60 * 60 * 1000) {
                    appState.startTime = parsed.startTime;
                    // Restart timer if quiz was in progress
                    if (parsed.questions.length > 0 && parsed.currentQuestionIndex < parsed.questions.length) {
                        setTimeout(() => {
                            startTimer();
                            showPage('quizPage');
                            document.getElementById('uploadSection').style.display = 'none';
                            document.getElementById('quizInterface').style.display = 'block';
                            renderNavigator();
                            showQuestion(appState.currentQuestionIndex);
                            showToast('Quiz session restored');
                        }, 1000);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error loading app state:', error);
    }
}

// Update all functions that modify appState to call saveAppState()

// Initialize the app
function init() {
    // Load data from localStorage
    storageDB.load();
    loadAppState();
    
    renderSubjects();
    setupEventListeners();
    
    // Apply saved theme
    const savedTheme = storageDB.get('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const floatingIcon = document.getElementById('floatingThemeIcon');
        if (floatingIcon) {
            floatingIcon.className = 'fas fa-sun';
        }
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.className = 'fas fa-sun';
        }
    }
    
    // Add smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
}

// Update functions to save state when modified
function selectAnswer(optionIndex) {
    if (appState.feedbackShown) return;
    
    appState.userAnswers[appState.currentQuestionIndex] = optionIndex;
    saveAppState();
    
    // Update UI
    const options = document.querySelectorAll('.option-btn');
    options.forEach((opt, i) => {
        opt.classList.toggle('selected', i === optionIndex);
    });
    
    showInstantFeedbackButton(optionIndex);
    updateNavigator();
}

function toggleBookmark() {
    const index = appState.currentQuestionIndex;
    const bookmarkIndex = appState.bookmarkedQuestions.indexOf(index);
    
    if (bookmarkIndex > -1) {
        appState.bookmarkedQuestions.splice(bookmarkIndex, 1);
    } else {
        appState.bookmarkedQuestions.push(index);
    }
    saveAppState();
    
    // Update button
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    if (appState.bookmarkedQuestions.includes(index)) {
        bookmarkBtn.classList.add('active');
        bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i> Saved';
        showToast('Question saved for review');
    } else {
        bookmarkBtn.classList.remove('active');
        bookmarkBtn.innerHTML = '<i class="far fa-bookmark"></i> Save for Review';
    }
}



function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    
    // Update floating theme icon
    const floatingIcon = document.getElementById('floatingThemeIcon');
    if (floatingIcon) {
        floatingIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    // Update quiz header theme icon (if exists)
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    storageDB.save('theme', isDark ? 'dark' : 'light');
    showToast(isDark ? 'Switched to dark mode' : 'Switched to light mode');
}

// Update achievement names to English
function getAchievementName(id) {
    const names = {
        'first_quiz': 'First Quiz',
        'perfect_score': 'Perfect Score',
        'streak_7': '7-Day Streak',
        'quiz_master': 'Quiz Master',
        'century': 'Century'
    };
    return names[id] || id;
}

// Update toast messages to English
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize app on load
window.addEventListener('DOMContentLoaded', () => {
    init();
});

// Save state before page unload
window.addEventListener('beforeunload', () => {
    saveAppState();
});
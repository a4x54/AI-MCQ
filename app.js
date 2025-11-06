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
        id: 'socialengineering',
        name: 'الهندسة الاجتماعية',
        nameEn: 'SOCIAL ENGINEERING',
        icon: 'fa-lock',
        color: '#8b5cf6',
        description: 'الهندسة الاجتماعية وتقنيات الاحتيال',
        lectures: [
            { id: 1, title: ' INTRODUCTION TO SOCIAL ENGINEERING', duration: '60 دقيقة', questionCount: 25,
                 topics: ['تعريفات الهندسة الاجتماعية', 'الخلفية التاريخية والتطور', 'المبادئ النفسية المستغلة','أنواع هجمات الهندسة الاجتماعية','حالة كفين ميتنك الدراسية'] },
            { id: 2, title: ' Human Psychology in Social Engineering', duration: '65 دقيقة', questionCount: 25,
                 topics: ['التحيزات المعرفية', 'استغلال الثقة والسلطة', ' تكتيكات الاستعجال', ' الآليات الدفاعية النفسية',' التطبيقات العملية'] }
        ]
    },
    {
        id: 'SCP',
        name: 'بروتوكولات الاتصال الآمن',
        nameEn: 'Secure Communication Protocols',
        icon: 'fa-network-wired',
        color: '#14b8a6',
        description: 'الاتصالات والبروتوكولات الشبكية',
        lectures: [
            { id: 1, title: 'مقدمة في الشبكات', duration: '45 دقيقة', questionCount: 0, topics: ['Network Types', 'Topology', 'Components'] }

        ]
    },
    {
        id: 'Engineering Management',
        name: 'ادارة الهندسة',
        nameEn: 'Engineering Management',
        icon: 'fa-database',
        color: '#f59e0b',
        description: 'مبادئ إدارة المشاريع الهندسية',
        lectures: [
            { id: 1, title: 'مقدمة في مبادئ إدارة المشاريع الهندسية ', duration: '40 دقيقة', questionCount: 0, topics: ['DBMS', 'Data Models', 'Architecture'] }
        ]
    },
    {
        id: 'techwriting',
        name: 'أسس الكتابة العلمية والتقنية',
        nameEn: 'Tech. And scientific writing  ',
        icon: 'fa-code',
        color: '#10b981',
        description: 'مبادئ وتقنيات الكتابة العلمية والتقنية',
        lectures: [
            { id: 1, title: 'مبادئ وتقنيات الكتابة العلمية والتقنية', duration: '45 دقيقة', questionCount: 0, topics: ['Software Crisis', 'Principles'] }
        ]
    },
    {
        id: 'ai',
        name: 'الذكاء الاصطناعي والأمن السيبراني',
        nameEn: 'AI and cybersecurity',
        icon: 'fa-brain',
        color: '#ef4444',
        description: 'مقدمة في الذكاء الاصطناعي وتطبيقاته في الأمن السيبراني',
        lectures: [ 
            { id: 1, title: 'Introduction to AI and its Role in Cybersecurity', duration: '90 minutes', questionCount: 35,
                 topics: [
                          'Foundations and goals of AI',
                          'Types and branches of AI',
                          'ML and Deep Learning concepts'] 
            },
            {   id: 2, title: 'From Databases to Data Mining in Cybersecurity', duration: '55 minutes', questionCount: 36,
                 topics: ['KDD Steps', 'AI vs Data Mining', 'Cybersecurity Applications', 'Challenges']
            },
            { id: 3, title: 'Handling Missing Values & Classification', duration: '90 minutes', questionCount: 36,
                topics: [
                        'Techniques for handling missing data',
                        'Understanding data randomness types',
                        'Classification algorithms and evaluation metrics'
                        ]
            }
        ]
    }
];

// Load questions dynamically from JSON file
const questionCache = {};

async function loadQuestionsForSubject(subjectId) {
    if (questionCache[subjectId]) return questionCache[subjectId];

    try {
        const response = await fetch(`questions/${subjectId}.json`);
        const data = await response.json();
        questionCache[subjectId] = data;
        return data;
    } catch (error) {
        console.error(error);
        return [];
    }
}


// Example: when starting a quiz
async function startQuiz(subjectId, lectureId) {
    appState.currentSubject = subjectId;
    appState.currentLecture = lectureId;
    
    appState.questions = await loadQuestionsForSubject(subjectId);
    
    // Filter questions by lecture if needed
    if (lectureId) {
        appState.questions = appState.questions.filter(q => q.lecture === lectureId.toString());
    }

    if (appState.questions.length === 0) {
        showToast("❌ No questions found for this lecture.");
        return;
    }

    document.getElementById("uploadSection").style.display = "none";
    document.getElementById("quizInterface").style.display = "block";
    renderQuestion();
}


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

// Start individual lecture (fixed to load from JSON)
async function startLecture(lectureId) {
    const subject = appState.currentSubject;
    const lecture = subject.lectures.find(l => l.id === lectureId);
    appState.currentLecture = lecture;
    appState.previousPage = 'lecturesPage';

    // Load questions dynamically from external JSON
    const allQuestions = await loadQuestionsForSubject(subject.id);

    // Filter by lecture
    const lectureQuestions = allQuestions.filter(q => q.lecture === lectureId.toString());
    
    if (lectureQuestions.length === 0) {
        showToast("❌ No questions found for this lecture.");
        return;
    }

    appState.questions = lectureQuestions;
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
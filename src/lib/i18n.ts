export type Lang = "en" | "fa";
export const LANGS: Lang[] = ["en", "fa"];
export const dirOf = (lang: Lang) => (lang === "fa" ? "rtl" : "ltr");

const en = {
  appName: "IELTS Vocab",
  // navigation
  "nav.dashboard": "Dashboard", "nav.library": "Library", "nav.add": "Add word", "nav.practice": "Practice",
  "nav.collections": "Collections", "nav.progress": "Progress", "nav.settings": "Settings", "nav.logout": "Log out",
  "nav.login": "Log in", "nav.register": "Create account", "nav.main": "Main navigation",
  // common
  "common.save": "Save", "common.cancel": "Cancel", "common.delete": "Delete", "common.edit": "Edit", "common.search": "Search",
  "common.loading": "Loading…", "common.back": "Back", "common.optional": "Optional", "common.all": "All", "common.none": "None",
  "common.apply": "Apply", "common.reset": "Reset", "common.previous": "Previous", "common.next": "Next", "common.open": "Open",
  "common.page": "Page {n} of {total}", "common.words": "{n} words", "common.never": "Never", "common.yes": "Yes", "common.close": "Close",
  "common.language": "Language", "common.theme": "Theme", "common.saved": "Saved",
  // landing
  "landing.title": "Remember the words you need for IELTS",
  "landing.subtitle": "Save words and phrases with their Persian meaning, practice them in six ways, and let spaced repetition bring each one back right before you forget it.",
  "landing.cta": "Start for free", "landing.hasAccount": "I already have an account",
  "landing.card.word": "resilient", "landing.card.meaning": "مقاوم، انعطاف‌پذیر", "landing.card.ladder": "Review ladder: next review in 3 days",
  "landing.f1.t": "Your own word bank", "landing.f1.d": "Words, phrases and sentences with translations, definitions, examples, tags and notes.",
  "landing.f2.t": "Six ways to practice", "landing.f2.d": "English to Persian, Persian to English, definitions, multiple choice, typing and difficult-word review.",
  "landing.f3.t": "Reviews that adapt", "landing.f3.d": "Right answers push the next review further away. Mistakes bring the word back within minutes.",
  "landing.f4.t": "Private and portable", "landing.f4.d": "Every account is separate. Import and export your vocabulary as CSV any time.",
  // auth
  "auth.login": "Log in", "auth.register": "Create account", "auth.email": "Email", "auth.password": "Password", "auth.name": "Your name",
  "auth.passwordHint": "At least 8 characters", "auth.haveAccount": "Already have an account?", "auth.noAccount": "New here?",
  "auth.err.invalid_credentials": "Email or password is incorrect, or there were too many attempts. Wait a few minutes and try again.",
  "auth.err.validation": "Check the highlighted fields.", "auth.err.email_taken": "An account with this email already exists. Try logging in.",
  "auth.err.rate_limited": "Too many sign-ups from this network. Try again later.",
  "auth.err.not_configured": "The database is not configured on this server yet.", "auth.err.generic": "Something went wrong. Try again.",
  "auth.field.email_invalid": "Enter a valid email address", "auth.field.name_required": "Enter your name",
  "auth.field.password_short": "Use at least 8 characters", "auth.field.password_long": "That password is too long",
  // dashboard
  "dash.title": "Dashboard", "dash.greeting": "Hello, {name}", "dash.total": "Words saved", "dash.attempts": "Answers given",
  "dash.correct": "Correct", "dash.incorrect": "Incorrect", "dash.accuracy": "Accuracy", "dash.today": "Words practiced today",
  "dash.goal": "{n} of {goal} words today", "dash.goalDone": "Daily goal reached", "dash.streak": "Streak", "dash.streakDays": "{n} days",
  "dash.practiceNow": "Practice now", "dash.due": "Due for review", "dash.dueEmpty": "Nothing is due. Practice any word whenever you like.",
  "dash.recentlyAdded": "Recently added", "dash.recentlyAddedEmpty": "Words you add will show up here.",
  "dash.mostPracticed": "Most practiced", "dash.mostDifficult": "Most difficult", "dash.recentlyPracticed": "Recently practiced",
  "dash.noneYet": "Nothing yet", "dash.emptyTitle": "Add your first word", "dash.emptyBody": "Save a word with its meaning and your statistics will start filling in here.",
  "dash.viewAll": "View all", "dash.newWords": "{n} new words waiting",
  // vocabulary form
  "vocab.english": "English word, phrase or sentence", "vocab.persian": "Persian translation", "vocab.definition": "English definition",
  "vocab.example": "Example sentence", "vocab.pos": "Part of speech", "vocab.synonyms": "Synonyms", "vocab.antonyms": "Antonyms",
  "vocab.pronunciation": "Pronunciation", "vocab.tags": "Tags", "vocab.collection": "Collection", "vocab.notes": "Personal notes",
  "vocab.difficulty": "Difficulty", "vocab.listHint": "Separate with commas", "vocab.add.title": "Add a word", "vocab.edit.title": "Edit word",
  "vocab.save": "Save word", "vocab.saveChanges": "Save changes", "vocab.noCollection": "No collection", "vocab.pos.none": "Not set",
  "vocab.diff.easy": "Easy", "vocab.diff.medium": "Medium", "vocab.diff.hard": "Hard",
  "vocab.duplicate": "This word is already in your vocabulary.", "vocab.openExisting": "Open the saved word",
  "vocab.created": "Saved. Add another word whenever you're ready.", "vocab.updated": "Changes saved.", "vocab.more": "More details",
  "pos.noun": "noun", "pos.verb": "verb", "pos.adjective": "adjective", "pos.adverb": "adverb", "pos.preposition": "preposition",
  "pos.conjunction": "conjunction", "pos.pronoun": "pronoun", "pos.interjection": "interjection", "pos.phrase": "phrase",
  "pos.sentence": "sentence", "pos.other": "other",
  // assistant
  "assist.title": "Translation help", "assist.translate": "Translate", "assist.define": "Define", "assist.enrich": "Full help",
  "assist.help": "Suggestions are not saved until you review them and press Save.", "assist.apply": "Use suggestions",
  "assist.applied": "Suggestions added to the form. Review them, then save.", "assist.notConfigured": "Translation help is not set up on this server. You can still fill in every field yourself.",
  "assist.collocations": "Common word combinations", "assist.mistakes": "Common mistakes", "assist.forms": "Related forms", "assist.cached": "Reused from an earlier lookup",
  "assist.enterText": "Type the English text first.", "assist.result": "Suggestions",
  // library
  "lib.title": "Library", "lib.searchPlaceholder": "Search English or Persian", "lib.collection": "Collection", "lib.tag": "Tag",
  "lib.difficulty": "Difficulty", "lib.status": "Review status", "lib.sort": "Sort by", "lib.sort.newest": "Newest", "lib.sort.oldest": "Oldest",
  "lib.sort.alpha": "A to Z", "lib.sort.practice": "Most practiced", "lib.status.new": "New", "lib.status.due": "Due", "lib.status.learning": "Learning",
  "lib.status.mastered": "Mastered", "lib.status.difficult": "Difficult", "lib.results": "{n} words found", "lib.emptyTitle": "Your library is empty",
  "lib.emptyBody": "Add words one by one, or import a CSV file from Settings.", "lib.noResultsTitle": "No words match these filters",
  "lib.noResultsBody": "Try a shorter search or clear a filter.", "lib.clear": "Clear filters", "lib.filters": "Search and filters",
  "lib.deleteTitle": "Delete this word?", "lib.deleteBody": "“{word}” and its practice history will be removed. This cannot be undone.",
  "lib.deleted": "Word deleted.",
  // details
  "detail.summary": "Practice summary", "detail.attempts": "Attempts", "detail.correct": "Correct", "detail.incorrect": "Incorrect",
  "detail.accuracy": "Accuracy", "detail.last": "Last practiced", "detail.next": "Next review", "detail.level": "Review level",
  "detail.recent": "Recent answers", "detail.status": "Status", "detail.noPractice": "You haven't practiced this word yet.", "detail.added": "Added",
  "detail.ladder": "Review ladder", "detail.empty": "Not set", "detail.now": "Now",
  // practice
  "practice.title": "Practice", "practice.setup": "Set up a session", "practice.mode": "Practice mode", "practice.count": "Number of questions",
  "practice.source": "Words", "practice.sourceAll": "All my words", "practice.sourceSelected": "Choose specific words", "practice.collection": "Collection",
  "practice.filter": "Which words", "practice.filter.any": "New and practiced", "practice.filter.new": "New words only", "practice.filter.practiced": "Practiced before",
  "practice.start": "Start practice", "practice.starting": "Preparing questions…", "practice.progress": "Question {n} of {total}",
  "practice.check": "Check answer", "practice.next": "Next question", "practice.finish": "See summary", "practice.correct": "Correct",
  "practice.wrong": "Not quite", "practice.answerIs": "The answer is", "practice.typeHere": "Type your answer", "practice.yourAnswer": "You answered",
  "practice.q.en-fa": "What does this mean in Persian?", "practice.q.fa-en": "Which English word means this?",
  "practice.q.def-en": "Which word matches this definition?", "practice.q.type": "Type the English word for this",
  "practice.mode.en-fa": "English to Persian", "practice.mode.fa-en": "Persian to English", "practice.mode.definition": "Definitions",
  "practice.mode.multiple-choice": "Multiple choice (mixed)", "practice.mode.typing": "Typing", "practice.mode.difficult": "Difficult-word review",
  "practice.desc.en-fa": "See the English, pick the Persian meaning.", "practice.desc.fa-en": "See the Persian, pick the English word.",
  "practice.desc.definition": "Read a definition, pick the word.", "practice.desc.multiple-choice": "A mix of all choice questions.",
  "practice.desc.typing": "Type the English word from its meaning.", "practice.desc.difficult": "Only words you miss often or that are due.",
  "practice.summary": "Session summary", "practice.score": "{c} of {t} correct", "practice.again": "Practice again", "practice.toDashboard": "Back to dashboard",
  "practice.skipped": "{n} words were left out because they lack the details this mode needs.", "practice.nothing": "Nothing to practice with these settings",
  "practice.nextReview": "Next review {when}", "practice.reviewMistakes": "Words to look at again", "practice.noMistakes": "No mistakes this session.",
  "practice.pick": "Pick words", "practice.picked": "{n} selected", "practice.fewWords": "Add a few words first, then come back to practice.",
  "practice.submitting": "Saving…", "practice.retryHint": "Could not save that answer. Check your connection and press the button again; it will not be counted twice.",
  // collections
  "col.title": "Collections", "col.new": "New collection", "col.name": "Collection name", "col.create": "Create", "col.rename": "Rename",
  "col.deleteTitle": "Delete this collection?", "col.deleteBody": "“{name}” will be removed. Its words are kept and moved to “No collection”.",
  "col.emptyTitle": "No collections yet", "col.emptyBody": "Group words by topic, source or exam section.", "col.view": "View words",
  "col.assignHint": "To put a word in a collection, edit the word and choose one.", "col.created": "Collection created.", "col.renamed": "Collection renamed.", "col.deleted": "Collection deleted.",
  // progress
  "prog.title": "Progress", "prog.activity": "Answers per day (last 14 days)", "prog.correctShort": "correct", "prog.difficult": "Difficult words",
  "prog.mostPracticed": "Most practiced words", "prog.emptyTitle": "No practice yet", "prog.emptyBody": "Finish a practice session and your progress will appear here.",
  "prog.accuracyOf": "{c} correct out of {t}", "prog.table": "Show as a table",
  // settings
  "set.title": "Settings", "set.interface": "Interface", "set.language": "Interface language", "set.theme": "Theme", "set.theme.light": "Light",
  "set.theme.dark": "Dark", "set.theme.system": "Match my device", "set.account": "Account", "set.name": "Display name", "set.email": "Email",
  "set.dailyGoal": "Daily goal (words)", "set.timezone": "Time zone", "set.saveProfile": "Save settings", "set.password": "Change password",
  "set.currentPassword": "Current password", "set.newPassword": "New password", "set.changePassword": "Change password", "set.passwordChanged": "Password changed.",
  "set.data": "Your data", "set.exportTitle": "Export vocabulary", "set.exportBody": "Download everything you saved as a CSV file that opens in Excel or Google Sheets.",
  "set.exportBtn": "Download CSV", "set.importTitle": "Import vocabulary", "set.importBody": "Upload a CSV with a header row. Columns: english, persian, definition, example, partOfSpeech, synonyms, antonyms, pronunciation, tags, collection, notes, difficulty. Only english is required. Separate list values with semicolons. Up to 300 rows at a time.",
  "set.chooseFile": "Choose CSV file", "set.checkFile": "Check file", "set.confirmImport": "Import {n} words", "set.importChecked": "File checked",
  "set.importValid": "{n} rows are ready to import.", "set.importInvalid": "{n} rows have problems and will be skipped:", "set.importDuplicates": "{n} rows are duplicates and will be skipped:",
  "set.importDone": "Imported {n} words.", "set.row": "Row {n}", "set.dupExists": "already in your library", "set.dupInFile": "repeated in this file",
  "set.noFile": "Choose a CSV file first.",
  // speech
  "speak.title": "Pronunciation", "speak.listen": "Listen", "speak.slow": "Slowly", "speak.repeat": "Repeat 3×", "speak.stop": "Stop",
  "speak.hint": "Listen, then say it out loud and repeat it a few times.", "speak.unsupported": "This browser can't read words aloud. Try Chrome, Safari or Edge.",
  "dictate.start": "Speak instead of typing", "dictate.stop": "Stop listening", "dictate.listening": "Listening… say it now.",
  "dictate.denied": "Microphone access is blocked. Allow it in your browser's site settings.", "dictate.none": "I didn't hear anything. Try again.",
  "dictate.failed": "Voice typing isn't available right now. Check your connection and try again.",
  // errors
  "err.generic": "Something went wrong. Try again.", "err.network": "Could not reach the server. Check your connection.", "err.unauthorized": "Your session ended. Please log in again.",
  "err.validation": "Check the form and try again.", "err.not_found": "That item no longer exists.", "err.duplicate": "That already exists.",
  "err.rate_limited": "Too many requests. Wait a moment and try again.", "err.not_configured": "This feature is not configured on the server.",
  "err.internal": "Something went wrong on our side. Try again.", "err.timeout": "The service took too long. Try again.", "err.conflict": "This changed elsewhere. Reload and try again.",
  "err.upstream_error": "The translation service had a problem. Try again later.", "err.upstream_rate_limited": "The translation service is busy. Try again in a minute.",
  "err.invalid_response": "The translation service sent an unreadable answer. Try again.", "err.invalid_csv": "That file could not be read as CSV.",
  "err.too_large": "That file is too large.", "err.too_many_rows": "That file has too many rows.", "err.nothing_to_practice": "Nothing to practice with these settings.",
  "err.wrong_password": "Your current password is incorrect.", "err.forbidden": "That request was blocked.",
} as const;

export type MsgKey = keyof typeof en;

const fa: Record<MsgKey, string> = {
  appName: "واژگان آیلتس",
  "nav.dashboard": "داشبورد", "nav.library": "کتابخانه", "nav.add": "افزودن واژه", "nav.practice": "تمرین",
  "nav.collections": "مجموعه‌ها", "nav.progress": "پیشرفت", "nav.settings": "تنظیمات", "nav.logout": "خروج",
  "nav.login": "ورود", "nav.register": "ساخت حساب", "nav.main": "ناوبری اصلی",
  "common.save": "ذخیره", "common.cancel": "انصراف", "common.delete": "حذف", "common.edit": "ویرایش", "common.search": "جستجو",
  "common.loading": "در حال بارگذاری…", "common.back": "بازگشت", "common.optional": "اختیاری", "common.all": "همه", "common.none": "هیچ‌کدام",
  "common.apply": "اعمال", "common.reset": "بازنشانی", "common.previous": "قبلی", "common.next": "بعدی", "common.open": "باز کردن",
  "common.page": "صفحه {n} از {total}", "common.words": "{n} واژه", "common.never": "هرگز", "common.yes": "بله", "common.close": "بستن",
  "common.language": "زبان", "common.theme": "پوسته", "common.saved": "ذخیره شد",
  "landing.title": "واژه‌های مورد نیاز آیلتس را به خاطر بسپارید",
  "landing.subtitle": "واژه‌ها و عبارت‌ها را با معنی فارسی ذخیره کنید، به شش روش تمرین کنید و بگذارید مرور فاصله‌دار هر واژه را درست پیش از فراموشی دوباره نشانتان دهد.",
  "landing.cta": "شروع رایگان", "landing.hasAccount": "حساب دارم",
  "landing.card.word": "resilient", "landing.card.meaning": "مقاوم، انعطاف‌پذیر", "landing.card.ladder": "نردبان مرور: مرور بعدی تا ۳ روز دیگر",
  "landing.f1.t": "بانک واژگان شخصی", "landing.f1.d": "واژه، عبارت و جمله همراه با ترجمه، تعریف، مثال، برچسب و یادداشت.",
  "landing.f2.t": "شش روش تمرین", "landing.f2.d": "انگلیسی به فارسی، فارسی به انگلیسی، تعریف، چندگزینه‌ای، تایپی و مرور واژه‌های سخت.",
  "landing.f3.t": "مرورِ سازگار با شما", "landing.f3.d": "پاسخ درست مرور بعدی را دورتر می‌کند و اشتباه، واژه را ظرف چند دقیقه برمی‌گرداند.",
  "landing.f4.t": "خصوصی و قابل انتقال", "landing.f4.d": "هر حساب جداست. هر زمان بخواهید واژگانتان را با CSV وارد یا خارج کنید.",
  "auth.login": "ورود", "auth.register": "ساخت حساب", "auth.email": "ایمیل", "auth.password": "گذرواژه", "auth.name": "نام شما",
  "auth.passwordHint": "حداقل ۸ نویسه", "auth.haveAccount": "حساب دارید؟", "auth.noAccount": "تازه آمده‌اید؟",
  "auth.err.invalid_credentials": "ایمیل یا گذرواژه نادرست است یا تلاش‌ها بیش از حد بوده. چند دقیقه صبر کنید و دوباره تلاش کنید.",
  "auth.err.validation": "فیلدهای مشخص‌شده را بررسی کنید.", "auth.err.email_taken": "حسابی با این ایمیل وجود دارد. وارد شوید.",
  "auth.err.rate_limited": "ثبت‌نام‌های بیش از حد از این شبکه. بعداً دوباره تلاش کنید.",
  "auth.err.not_configured": "پایگاه داده روی این سرور هنوز تنظیم نشده است.", "auth.err.generic": "مشکلی پیش آمد. دوباره تلاش کنید.",
  "auth.field.email_invalid": "یک ایمیل معتبر وارد کنید", "auth.field.name_required": "نام خود را وارد کنید",
  "auth.field.password_short": "حداقل ۸ نویسه استفاده کنید", "auth.field.password_long": "این گذرواژه بیش از حد طولانی است",
  "dash.title": "داشبورد", "dash.greeting": "سلام، {name}", "dash.total": "واژه‌های ذخیره‌شده", "dash.attempts": "پاسخ‌های داده‌شده",
  "dash.correct": "درست", "dash.incorrect": "نادرست", "dash.accuracy": "دقت", "dash.today": "واژه‌های تمرین‌شده امروز",
  "dash.goal": "{n} از {goal} واژه امروز", "dash.goalDone": "هدف روزانه کامل شد", "dash.streak": "روزهای پیاپی", "dash.streakDays": "{n} روز",
  "dash.practiceNow": "شروع تمرین", "dash.due": "موعد مرور", "dash.dueEmpty": "چیزی موعدش نرسیده. هر واژه‌ای را که خواستید تمرین کنید.",
  "dash.recentlyAdded": "تازه اضافه‌شده", "dash.recentlyAddedEmpty": "واژه‌هایی که اضافه کنید اینجا نمایش داده می‌شوند.",
  "dash.mostPracticed": "پرتمرین‌ترین", "dash.mostDifficult": "سخت‌ترین", "dash.recentlyPracticed": "اخیراً تمرین‌شده",
  "dash.noneYet": "هنوز چیزی نیست", "dash.emptyTitle": "اولین واژه‌تان را اضافه کنید", "dash.emptyBody": "یک واژه را با معنی‌اش ذخیره کنید تا آمارها اینجا پر شوند.",
  "dash.viewAll": "مشاهده همه", "dash.newWords": "{n} واژه تازه در انتظار",
  "vocab.english": "واژه، عبارت یا جمله انگلیسی", "vocab.persian": "ترجمه فارسی", "vocab.definition": "تعریف انگلیسی",
  "vocab.example": "جمله مثال", "vocab.pos": "نقش دستوری", "vocab.synonyms": "مترادف‌ها", "vocab.antonyms": "متضادها",
  "vocab.pronunciation": "تلفظ", "vocab.tags": "برچسب‌ها", "vocab.collection": "مجموعه", "vocab.notes": "یادداشت شخصی",
  "vocab.difficulty": "سختی", "vocab.listHint": "با ویرگول جدا کنید", "vocab.add.title": "افزودن واژه", "vocab.edit.title": "ویرایش واژه",
  "vocab.save": "ذخیره واژه", "vocab.saveChanges": "ذخیره تغییرات", "vocab.noCollection": "بدون مجموعه", "vocab.pos.none": "تعیین نشده",
  "vocab.diff.easy": "آسان", "vocab.diff.medium": "متوسط", "vocab.diff.hard": "سخت",
  "vocab.duplicate": "این واژه از قبل در واژگان شما هست.", "vocab.openExisting": "باز کردن واژه ذخیره‌شده",
  "vocab.created": "ذخیره شد. هر زمان آماده بودید واژه بعدی را اضافه کنید.", "vocab.updated": "تغییرات ذخیره شد.", "vocab.more": "جزئیات بیشتر",
  "pos.noun": "اسم", "pos.verb": "فعل", "pos.adjective": "صفت", "pos.adverb": "قید", "pos.preposition": "حرف اضافه",
  "pos.conjunction": "حرف ربط", "pos.pronoun": "ضمیر", "pos.interjection": "فعل‌صوت", "pos.phrase": "عبارت",
  "pos.sentence": "جمله", "pos.other": "سایر",
  "assist.title": "کمک ترجمه", "assist.translate": "ترجمه", "assist.define": "تعریف", "assist.enrich": "کمک کامل",
  "assist.help": "پیشنهادها تا وقتی بررسی نکنید و ذخیره را نزنید ذخیره نمی‌شوند.", "assist.apply": "استفاده از پیشنهادها",
  "assist.applied": "پیشنهادها به فرم اضافه شد. بررسی کنید و سپس ذخیره کنید.", "assist.notConfigured": "کمک ترجمه روی این سرور تنظیم نشده است. همچنان می‌توانید همه فیلدها را دستی پر کنید.",
  "assist.collocations": "هم‌آیندهای رایج", "assist.mistakes": "اشتباهات رایج", "assist.forms": "شکل‌های مرتبط", "assist.cached": "از جستجوی قبلی استفاده شد",
  "assist.enterText": "ابتدا متن انگلیسی را بنویسید.", "assist.result": "پیشنهادها",
  "lib.title": "کتابخانه", "lib.searchPlaceholder": "جستجو در انگلیسی یا فارسی", "lib.collection": "مجموعه", "lib.tag": "برچسب",
  "lib.difficulty": "سختی", "lib.status": "وضعیت مرور", "lib.sort": "مرتب‌سازی", "lib.sort.newest": "جدیدترین", "lib.sort.oldest": "قدیمی‌ترین",
  "lib.sort.alpha": "الفبایی", "lib.sort.practice": "پرتمرین‌ترین", "lib.status.new": "جدید", "lib.status.due": "موعد مرور", "lib.status.learning": "در حال یادگیری",
  "lib.status.mastered": "مسلط", "lib.status.difficult": "سخت", "lib.results": "{n} واژه پیدا شد", "lib.emptyTitle": "کتابخانه‌تان خالی است",
  "lib.emptyBody": "واژه‌ها را یکی‌یکی اضافه کنید یا از تنظیمات فایل CSV وارد کنید.", "lib.noResultsTitle": "واژه‌ای با این فیلترها پیدا نشد",
  "lib.noResultsBody": "جستجوی کوتاه‌تری امتحان کنید یا یک فیلتر را پاک کنید.", "lib.clear": "پاک کردن فیلترها", "lib.filters": "جستجو و فیلترها",
  "lib.deleteTitle": "این واژه حذف شود؟", "lib.deleteBody": "«{word}» و سابقه تمرینش حذف می‌شود. این کار قابل بازگشت نیست.",
  "lib.deleted": "واژه حذف شد.",
  "detail.summary": "خلاصه تمرین", "detail.attempts": "تعداد تلاش", "detail.correct": "درست", "detail.incorrect": "نادرست",
  "detail.accuracy": "دقت", "detail.last": "آخرین تمرین", "detail.next": "مرور بعدی", "detail.level": "سطح مرور",
  "detail.recent": "پاسخ‌های اخیر", "detail.status": "وضعیت", "detail.noPractice": "هنوز این واژه را تمرین نکرده‌اید.", "detail.added": "تاریخ افزودن",
  "detail.ladder": "نردبان مرور", "detail.empty": "تعیین نشده", "detail.now": "اکنون",
  "practice.title": "تمرین", "practice.setup": "تنظیم جلسه تمرین", "practice.mode": "نوع تمرین", "practice.count": "تعداد سؤال‌ها",
  "practice.source": "واژه‌ها", "practice.sourceAll": "همه واژه‌های من", "practice.sourceSelected": "انتخاب واژه‌های مشخص", "practice.collection": "مجموعه",
  "practice.filter": "کدام واژه‌ها", "practice.filter.any": "جدید و تمرین‌شده", "practice.filter.new": "فقط واژه‌های جدید", "practice.filter.practiced": "قبلاً تمرین‌شده",
  "practice.start": "شروع تمرین", "practice.starting": "در حال آماده‌سازی سؤال‌ها…", "practice.progress": "سؤال {n} از {total}",
  "practice.check": "بررسی پاسخ", "practice.next": "سؤال بعدی", "practice.finish": "مشاهده خلاصه", "practice.correct": "درست",
  "practice.wrong": "نه کاملاً", "practice.answerIs": "پاسخ این است", "practice.typeHere": "پاسخ را بنویسید", "practice.yourAnswer": "پاسخ شما",
  "practice.q.en-fa": "معنی فارسی این چیست؟", "practice.q.fa-en": "کدام واژه انگلیسی این معنی را دارد؟",
  "practice.q.def-en": "کدام واژه با این تعریف می‌خواند؟", "practice.q.type": "واژه انگلیسی این را بنویسید",
  "practice.mode.en-fa": "انگلیسی به فارسی", "practice.mode.fa-en": "فارسی به انگلیسی", "practice.mode.definition": "تعریف‌ها",
  "practice.mode.multiple-choice": "چندگزینه‌ای (ترکیبی)", "practice.mode.typing": "تایپی", "practice.mode.difficult": "مرور واژه‌های سخت",
  "practice.desc.en-fa": "انگلیسی را ببینید، معنی فارسی را انتخاب کنید.", "practice.desc.fa-en": "فارسی را ببینید، واژه انگلیسی را انتخاب کنید.",
  "practice.desc.definition": "تعریف را بخوانید، واژه را انتخاب کنید.", "practice.desc.multiple-choice": "ترکیبی از همه سؤال‌های گزینه‌ای.",
  "practice.desc.typing": "واژه انگلیسی را از روی معنی بنویسید.", "practice.desc.difficult": "فقط واژه‌هایی که زیاد اشتباه می‌کنید یا موعدشان رسیده.",
  "practice.summary": "خلاصه جلسه", "practice.score": "{c} از {t} درست", "practice.again": "تمرین دوباره", "practice.toDashboard": "بازگشت به داشبورد",
  "practice.skipped": "{n} واژه کنار گذاشته شد چون جزئیات لازم برای این نوع تمرین را ندارند.", "practice.nothing": "با این تنظیمات چیزی برای تمرین نیست",
  "practice.nextReview": "مرور بعدی {when}", "practice.reviewMistakes": "واژه‌هایی که باید دوباره ببینید", "practice.noMistakes": "در این جلسه اشتباهی نداشتید.",
  "practice.pick": "انتخاب واژه‌ها", "practice.picked": "{n} انتخاب شد", "practice.fewWords": "ابتدا چند واژه اضافه کنید و بعد برای تمرین برگردید.",
  "practice.submitting": "در حال ذخیره…", "practice.retryHint": "این پاسخ ذخیره نشد. اتصال را بررسی کنید و دوباره دکمه را بزنید؛ دو بار شمرده نمی‌شود.",
  "col.title": "مجموعه‌ها", "col.new": "مجموعه جدید", "col.name": "نام مجموعه", "col.create": "ساخت", "col.rename": "تغییر نام",
  "col.deleteTitle": "این مجموعه حذف شود؟", "col.deleteBody": "«{name}» حذف می‌شود. واژه‌های آن می‌مانند و به «بدون مجموعه» می‌روند.",
  "col.emptyTitle": "هنوز مجموعه‌ای ندارید", "col.emptyBody": "واژه‌ها را بر اساس موضوع، منبع یا بخش آزمون گروه‌بندی کنید.", "col.view": "مشاهده واژه‌ها",
  "col.assignHint": "برای قرار دادن واژه در مجموعه، واژه را ویرایش کنید و مجموعه را انتخاب کنید.", "col.created": "مجموعه ساخته شد.", "col.renamed": "نام مجموعه تغییر کرد.", "col.deleted": "مجموعه حذف شد.",
  "prog.title": "پیشرفت", "prog.activity": "پاسخ‌ها در هر روز (۱۴ روز اخیر)", "prog.correctShort": "درست", "prog.difficult": "واژه‌های سخت",
  "prog.mostPracticed": "پرتمرین‌ترین واژه‌ها", "prog.emptyTitle": "هنوز تمرینی نداشته‌اید", "prog.emptyBody": "یک جلسه تمرین را تمام کنید تا پیشرفتتان اینجا نمایش داده شود.",
  "prog.accuracyOf": "{c} درست از {t}", "prog.table": "نمایش به‌صورت جدول",
  "set.title": "تنظیمات", "set.interface": "رابط کاربری", "set.language": "زبان رابط", "set.theme": "پوسته", "set.theme.light": "روشن",
  "set.theme.dark": "تیره", "set.theme.system": "مطابق دستگاه", "set.account": "حساب کاربری", "set.name": "نام نمایشی", "set.email": "ایمیل",
  "set.dailyGoal": "هدف روزانه (واژه)", "set.timezone": "منطقه زمانی", "set.saveProfile": "ذخیره تنظیمات", "set.password": "تغییر گذرواژه",
  "set.currentPassword": "گذرواژه فعلی", "set.newPassword": "گذرواژه جدید", "set.changePassword": "تغییر گذرواژه", "set.passwordChanged": "گذرواژه تغییر کرد.",
  "set.data": "داده‌های شما", "set.exportTitle": "خروجی گرفتن از واژگان", "set.exportBody": "همه چیزهایی را که ذخیره کرده‌اید به‌صورت فایل CSV (قابل باز شدن در Excel و Google Sheets) دانلود کنید.",
  "set.exportBtn": "دانلود CSV", "set.importTitle": "وارد کردن واژگان", "set.importBody": "یک فایل CSV با ردیف عنوان بارگذاری کنید. ستون‌ها: english، persian، definition، example، partOfSpeech، synonyms، antonyms، pronunciation، tags، collection، notes، difficulty. فقط english الزامی است. مقادیر فهرستی را با نقطه‌ویرگول جدا کنید. تا ۳۰۰ ردیف در هر بار.",
  "set.chooseFile": "انتخاب فایل CSV", "set.checkFile": "بررسی فایل", "set.confirmImport": "وارد کردن {n} واژه", "set.importChecked": "فایل بررسی شد",
  "set.importValid": "{n} ردیف آماده وارد شدن است.", "set.importInvalid": "{n} ردیف مشکل دارد و کنار گذاشته می‌شود:", "set.importDuplicates": "{n} ردیف تکراری است و کنار گذاشته می‌شود:",
  "set.importDone": "{n} واژه وارد شد.", "set.row": "ردیف {n}", "set.dupExists": "از قبل در کتابخانه شما هست", "set.dupInFile": "در همین فایل تکرار شده",
  "set.noFile": "ابتدا یک فایل CSV انتخاب کنید.",
  "speak.title": "تلفظ", "speak.listen": "گوش دادن", "speak.slow": "آهسته", "speak.repeat": "تکرار ۳ بار", "speak.stop": "توقف",
  "speak.hint": "گوش دهید، بعد بلند تکرار کنید و چند بار بگویید.", "speak.unsupported": "این مرورگر نمی‌تواند واژه‌ها را بلند بخواند. Chrome، Safari یا Edge را امتحان کنید.",
  "dictate.start": "به‌جای تایپ، بگویید", "dictate.stop": "توقف شنیدن", "dictate.listening": "در حال شنیدن… بگویید.",
  "dictate.denied": "دسترسی به میکروفون مسدود است. در تنظیمات سایت در مرورگر آن را مجاز کنید.", "dictate.none": "چیزی نشنیدم. دوباره تلاش کنید.",
  "dictate.failed": "تایپ صوتی الان در دسترس نیست. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.",
  "err.generic": "مشکلی پیش آمد. دوباره تلاش کنید.", "err.network": "ارتباط با سرور برقرار نشد. اتصال خود را بررسی کنید.", "err.unauthorized": "نشست شما پایان یافت. دوباره وارد شوید.",
  "err.validation": "فرم را بررسی کنید و دوباره تلاش کنید.", "err.not_found": "این مورد دیگر وجود ندارد.", "err.duplicate": "این مورد از قبل وجود دارد.",
  "err.rate_limited": "درخواست‌ها بیش از حد است. کمی صبر کنید و دوباره تلاش کنید.", "err.not_configured": "این قابلیت روی سرور تنظیم نشده است.",
  "err.internal": "مشکلی سمت ما پیش آمد. دوباره تلاش کنید.", "err.timeout": "سرویس بیش از حد طول کشید. دوباره تلاش کنید.", "err.conflict": "این مورد جای دیگری تغییر کرده. صفحه را تازه کنید و دوباره تلاش کنید.",
  "err.upstream_error": "سرویس ترجمه مشکل داشت. بعداً دوباره تلاش کنید.", "err.upstream_rate_limited": "سرویس ترجمه شلوغ است. یک دقیقه بعد دوباره تلاش کنید.",
  "err.invalid_response": "سرویس ترجمه پاسخ ناخوانایی فرستاد. دوباره تلاش کنید.", "err.invalid_csv": "این فایل به‌عنوان CSV خوانده نشد.",
  "err.too_large": "این فایل بیش از حد بزرگ است.", "err.too_many_rows": "این فایل ردیف‌های زیادی دارد.", "err.nothing_to_practice": "با این تنظیمات چیزی برای تمرین نیست.",
  "err.wrong_password": "گذرواژه فعلی نادرست است.", "err.forbidden": "این درخواست مسدود شد.",
};

export const messages: Record<Lang, Record<MsgKey, string>> = { en, fa };

export function translate(lang: Lang, key: MsgKey, vars?: Record<string, string | number>): string {
  let s: string = messages[lang][key] ?? messages.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export type T = (key: MsgKey, vars?: Record<string, string | number>) => string;
export const makeT = (lang: Lang): T => (key, vars) => translate(lang, key, vars);

/** Maps an API/server error code to a translated message (falls back to a generic one). */
export function errorMessage(t: T, code: string | undefined): string {
  const key = `err.${code ?? "generic"}` as MsgKey;
  return key in messages.en ? t(key) : t("err.generic");
}

export function formatNumber(n: number, lang: Lang) {
  return new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US").format(n);
}

export function formatDate(ms: number, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "fa" ? "fa-IR" : "en-GB", { dateStyle: "medium" }).format(new Date(ms));
}

export function formatWhen(ms: number, lang: Lang, now = Date.now()) {
  const diff = ms - now;
  const rtf = new Intl.RelativeTimeFormat(lang === "fa" ? "fa" : "en", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60_000) return rtf.format(0, "minute");
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
  return rtf.format(Math.round(diff / 86_400_000), "day");
}

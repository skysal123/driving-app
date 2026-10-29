/* DriveDesk prototype — UI translations (English + Marathi) */
(function () {
  'use strict';

  const KEY = 'drivedesk.lang';
  const LANGS = [
    { code: 'en', label: 'English' },
    { code: 'mr', label: 'मराठी' }
  ];

  const MR = {
    /* navigation & chrome */
    'Home': 'होम',
    'Students': 'विद्यार्थी',
    'Classes': 'क्लासेस',
    'Reports': 'रिपोर्ट्स',
    'More': 'आणखी',
    'Settings': 'सेटिंग्ज',
    'Language': 'भाषा',
    'English / मराठी': 'English / मराठी',

    /* login */
    'Run your driving school from your pocket.': 'ड्रायव्हिंग स्कूल तुमच्या खिशातून चालवा.',
    'Welcome back': 'पुन्हा स्वागत आहे',
    'Sign in to manage students, classes and fees.': 'विद्यार्थी, क्लासेस आणि फी व्यवस्थापित करण्यासाठी लॉगिन करा.',
    'Mobile or email': 'मोबाईल किंवा ईमेल',
    'Password': 'पासवर्ड',
    'Show password': 'पासवर्ड दाखवा',
    'Remember me': 'मला लक्षात ठेवा',
    'Forgot password?': 'पासवर्ड विसरलात?',
    'Enter password': 'पासवर्ड टाका',
    'Sign in': 'लॉगिन',
    'or': 'अथवा',
    'Explore demo school': 'नमुना स्कूल पहा',
    'Sign in with your school account.': 'Sign in with your school account. ',
    ' opens sample data saved on this device.': ' यातून या डिव्हाइसवर साठवलेला नमुना डेटा दिसतो.',
    'Demo login is prefilled. Any password with 4+ characters works, or tap': 'नमुना लॉगिन आधीच भरलेला आहे. 4 किंवा त्याहून जास्त अक्षरांचा कोणताही पासवर्ड चालेल, किंवा दाबा',
    'New school?': 'नवीन स्कूल उभारायचा?',
    'Talk to us': 'आमच्याशी संवाद करा',
    'Log out': 'लॉगआउट',
    'Loading DriveDesk…': 'DriveDesk लोड होत आहे…',
    'Connecting to your school.': 'तुमच्या स्कूलशी जोडत आहे.',
    'Enter your mobile number or email.': 'तुमचा मोबाईल नंबर किंवा ईमेल टाका.',
    'Password must be at least 4 characters.': 'पासवर्ड किमान 4 अक्षरांचा असावा.',
    'Could not sign in. Try again.': 'लॉगिन होऊ शकले नाही. पुन्हा प्रयत्न करा.',

    /* dashboard */
    'Mark attendance': 'हजेरी लावा',
    'Collect payment': 'पेमेंट घ्या',
    'Search student or trainer...': 'विद्यार्थी किंवा ट्रेनर शोधा...',
    'Search': 'शोध',
    'Trainers': 'ट्रेनर',
    'No matches found': 'जुळणी सापडली नाही',
    'Check the spelling, or start a new admission.': 'देवाणघेवाण तपासा, किंवा नवीन प्रवेश सुरू करा.',
    'See all students': 'सर्व विद्यार्थी पहा',
    'Active students': 'सध्या शिकत असलेले विद्यार्थी',
    'Classes today': 'आजचे क्लासेस',
    'Present today': 'आज उपस्थित',
    "Today's classes": 'आजचे क्लासेस',
    'Fees pending': 'फी बाकी',
    'View all': 'सर्व पहा',
    'View students': 'विद्यार्थी पहा',
    'All fees cleared': 'सर्व फी भरली आहे',
    'Every student has paid in full.': 'प्रत्येक विद्यार्थीने पूर्ण फी भरली आहे.',
    'No classes today': 'आज कोणतेही क्लासेस नाहीत',
    'Scheduled classes will appear here automatically.': 'वेळापत्रकातील क्लासेस येथे आपोआप दिसतील.',
    'No new notifications': 'सध्या नवीन सूचना नाहीत',
    'Present': 'हजर',
    'Absent': 'गैरहजर',
    'Upcoming': 'आगामी',
    'Next': 'पुढे',
    'Today': 'आज',
    'Tomorrow': 'उद्या',
    'Mon': 'सोम',
    'Tue': 'मंगळ',
    'Wed': 'बुध',
    'Thu': 'गुरु',
    'Fri': 'शुक्र',
    'Sat': 'शनि',
    'Sun': 'रवि',

    /* admission wizard */
    'New admission': 'नवीन प्रवेश',
    'Student details': 'विद्यार्थ्याची माहिती',
    'Start with the basics. You can add more later from the profile.': 'आधी मूळ माहिती भरा. बाकीच्या गोष्टी नंतर प्रोफाइलमधून जोडता येतील.',
    'Course & schedule': 'कोर्स आणि वेळापत्रक',
    'Fees & documents': 'फी आणि कागदपत्रे',
    'Agreement & signature': 'संमतीपत्र आणि स्वाक्षरी',
    'Student photo': 'विद्यार्थ्याचा फोटो',
    'Optional. Used on the ID card and the signed agreement.': 'ऐच्छिक. ओळखपत्र व स्वाक्षरी केलेल्या संमतीपत्रावर वापरला जातो.',
    'Full name': 'पूर्ण नाव',
    'Mobile number': 'मोबाईल नंबर',
    '10-digit mobile': 'दहा अंकी मोबाईल',
    'Used for class reminders and WhatsApp updates.': 'क्लास स्मरणपत्रे व WhatsApp अपडेटसाठी वापरला जातो.',
    'Address': 'पत्ता',
    'Course': 'कोर्स',
    'Total course fee': 'कोर्सची एकूण फी',
    'Course length (classes)': 'एकूण क्लासेस',
    'Class timing': 'क्लासची वेळ',
    'Start date': 'सुरू होण्याची तारीख',
    'Instructor': 'प्रशिक्षक',
    'Vehicle': 'वाहन',
    'Amount paid now': 'आत्ता भरलेली रक्कम',
    'Leave 0 if the fee is paid later.': 'फी नंतर भरायची असल्यास 0 सोडा.',
    'Balance after payment': 'पेमेंटनंतरची बाकी रक्कम',
    'Balance due': 'बाकी रक्कम',
    'Payment mode': 'पेमेंट पद्धत',
    'Cash': 'रोख',
    'Card': 'कार्ड',
    "Learner's licence": 'लर्निंग लायसन्स',
    'Does the student already have one?': 'विद्यार्थ्याकडे आधीच आहे का?',
    'Licence number': 'लायसन्स नंबर',
    'Valid till': 'वैधता दिनांक',
    'Review admission': 'प्रवेश तपासा',
    'Review the details, capture the student signature and finish the admission.': 'माहिती तपासा, विद्यार्थ्याची स्वाक्षरी घ्या आणि प्रवेश पूर्ण करा.',
    'Record what was collected now. The balance stays visible on the dashboard.': 'एवढी रक्कम नोंदवा. बाकी रक्कम डॅशबोर्डवर दिसत राहील.',
    'Student': 'विद्यार्थी',
    'Mobile': 'मोबाईल',
    'Schedule': 'वेळापत्रक',
    'Fee paid': 'भरलेली रक्कम',
    'Terms & conditions': 'अटी व शर्ती',
    'Student agreement': 'विद्यार्थी संमतीपत्र',
    'Stored with a timestamp and device record as proof of acceptance.': 'वेळ व डिव्हाइस नोंदसह साठवलेली ही स्वाक्षरी मान्यतेचा पुरावा आहे.',
    'Sign here': 'इकडे स्वाक्षरी करा',
    'Use a finger or stylus': 'बोट किंवा स्टायलस वापरा',
    'Clear': 'पुसा',
    'Back': 'मागे जा',
    'Continue': 'पुढे जा',
    'Complete admission': 'प्रवेश पूर्ण करा',
    'I have read and agree to the terms. I consent to the school storing this student\'s photo, signature and records digitally.': 'मी अटी वाचून घेतल्या आहेत व मान्य करतो. विद्यार्थ्याचा फोटो, स्वाक्षरी व नोंदी डिजिटल स्वरूपात ठेवण्याची माझी संमती आहे.',
    'Discard admission?': 'प्रवेश रद्द करायचा?',
    'The details and signature entered so far will be lost.': 'आतापर्यंत टाकलेली माहिती व स्वाक्षरी नष्ट होईल.',
    'Discard': 'रद्द करा',

    /* fees & subscription */
    'Record payment': 'पेमेंटची नोंद करा',
    'Amount': 'रक्कम',
    'Note (optional)': 'नोंद (ऐच्छिक)',
    'This student has paid in full': 'या विद्यार्थ्याने पूर्ण फी भरली आहे',
    'No pending fees — all students have paid in full': 'सर्व फी भरली आहे — कोणाची फी बाकी नाही',
    'days': 'दिवस',
    'Renew subscription': 'सबस्क्रिप्शन नूतनीकरण करा',
    '/month': ' / महिना',
    'Access paused. Submit your payment reference to restore write access.': 'पेमेंट वेळेत झाले नाही, त्यामुळे आत्ता फक्त पहण्याची सुविधा आहे. पेमेंट पुरावा पाठवल्यावर पुन्हा सुरू होईल.',
    'Grace window active. Renew now to avoid interruption.': 'नूतनीकरण उशीराने झाले आहे. काही दिवसांत रक्कम भरा, अन्यथा सेवा बंद होईल.',
    'Active': 'सुरू',
    'Completed': 'पूर्ण',
    'Fees due': 'फी बाकी',
    'School': 'स्कूल',
    'App': 'अ‍ॅप',
    'Edit profile': 'प्रोफाइल एडिट करा',
    'These choices appear during admission.': 'प्रवेश करताना हेच पर्याय दिसतील.',
    'Submit for verification': 'पडताळणीसाठी पाठवा',
    'Waiting for verification': 'पडताळणी सुरू आहे',
    'Renewal submitted for verification': 'नूतनीकरण पडताळणीसाठी नोंदवले',
    'Payment of balance fees': 'बाकी फीची नोंद',

    /* attendance sheet */
    'Attendance': 'हजेरी',
    'Classes attended today': 'आज उपस्थित क्लासेस',
    'Session notes (optional)': 'क्लासच्या नोंदी (ऐच्छिक)',
    'Student signature': 'विद्यार्थ्याची स्वाक्षरी',
    'Sign here as proof': 'पुराव्यासाठी इकडे स्वाक्षरी करा',
    'Signature is timestamped': 'स्वाक्षरीसह वेळ नोंदला जातो',
    'Attach time & location with the record': 'नोंदीसोबत वेळ व ठिकाण जोडा',
    'Mark absent': 'गैरहजर नोंदवा',
    'Mark present': 'हजर नोंदवा',
    'Sessions are numbered automatically for today. Each present class counts once.': 'आजच्या क्लासेस आपोआप क्रमांकित होतात. प्रत्येक उपस्थित क्लास एकदाच गणली जाते.',
    'No instructors yet. Add one before marking a class.': 'प्रशिक्षक जोडलेला नाही. क्लास नोंदवण्याआधी एक जोडा.',
    'Add instructor': 'प्रशिक्षक जोडा',
    'This class is credited to the instructor in reports.': 'रिपोर्टमध्ये हे क्लास या प्रशिक्षकावर गणले जाते.',

    /* more menu */
    'Instructors & vehicles': 'प्रशिक्षक आणि वाहने',
    'Courses': 'कोर्सेस',
    'Fee per class (₹)': 'प्रति क्लास फी (₹)',
    'Default classes': 'डीफॉल्ट क्लासेस',
    'Add course': 'कोर्स जोडा',
    'Save changes': 'बदल सेव्ह करा',
    'Cancel': 'रद्द करा',
    'Courses updated': 'कोर्सेस अपडेट झाले',
    'Per-class fee and course length': 'प्रति क्लास फी आणि एकूण क्लासेस',
    'Submitting...': 'पाठवत आहे...',
    'Business, trainer and vehicle reports': 'व्यवसाय, प्रशिक्षक व वाहन रिपोर्ट्स',
    'Notifications': 'स्मरणपत्रे',
    'Class reminders for students': 'विद्यार्थ्यांसाठी क्लास स्मरणपत्रे',
    'Privacy & data': 'गोपनीयता व माहिती',
    'Consent, exports and deletion': 'संमती, माहिती निर्गम व नष्टीकरण',
    'Help & support': 'मदत व सहाय्य',
    'Reset demo data': 'नमुना डेटा रीसेट करा',
    'Restore the sample school': 'नमुना स्कूल परत मिळवा',
    'Made for Indian driving schools': 'भारतीय ड्रायव्हिंग स्कूलसाठी बनवले',

    /* shared UI */
    'Save': 'सेव्ह करा',
    'Add': 'जोडा',
    'Edit': 'एडिट करा',
    'Delete': 'डिलीट करा',
    'Remove': 'काढून टाका',
    'Close': 'बंद करा',
    'Confirm': 'निश्चित करा',
    'Are you sure?': 'तुम्हाला खात्री आहे?',
    'Required': 'आवश्यक',
    'You can add up to 12 courses': 'तुम्ही कमाल 12 कोर्सेस जोडू शकता',
    'Keep at least one course': 'कमीत कमी एक कोर्स ठेवा',
    'Course names must be unique.': 'कोर्सची नावे वेगळी असावीत.',
    'Every course needs a name.': 'प्रत्येक कोर्सला नाव आवश्यक आहे.',
    'Add at least one course.': 'कमीत कमी एक कोर्स जोडा.',
    'Could not save changes': 'बदल सेव्ह होऊ शकले नाहीत',
    'Saving...': 'सेव्ह होत आहे...',
    'Saving admission...': 'प्रवेश सेव्ह होत आहे...',
    'Course name': 'कोर्सचे नाव',
    'Set each course name with a per-class fee and default course length. Admission fees are prefilled as per-class fee × sessions and can still be edited there.': 'प्रत्येक कोर्सचे नाव, प्रति क्लास फी व आहे तितक्या क्लासेस भरा. प्रवेशात एकूण फी या हिशोबाने आपोआप भरली जाते, ती नंतर बदलता येते.',
    'Changes apply to new admissions. Existing students keep the course and fee recorded with them.': 'बदल नवीन प्रवेशांना लागू होतात. जूने विद्यार्थी त्यांच्याबरोबर नंोदवलेला कोर्स व फी असणार.',
    'These options appear when admitting a student and scheduling classes. Changes apply for the whole school.': 'प्रवेश करताना व क्लासाची वेळ देताना हेच पर्याय दिसतील. बदल संपूर्ण स्कूलसाठी लागू होतात.',
    'Instructors': 'प्रशिक्षक',
    'Vehicles': 'वाहने',
    'Instructor name': 'प्रशिक्षकाचे नाव',
    'Recent requests': 'अलीकडील विनंती',
    'approved': 'मान्य',
    'rejected': 'नाकारले',
    'pending': 'प्रक्रियेत',
    'No classes are remaining in this course.': 'या कोर्समध्ये आता कोणतीही क्लास बाकी नाही.',

    /* toasts */
    'Photo added': 'फोटो जोडला',
    'Could not read that image': 'फोटो वाचता आला नाही',
    'Accept the terms and conditions first': 'आधी अटी व शर्ती मान्य करा',
    'Student signature is required': 'विद्यार्थ्याची स्वाक्षरी आवश्यक आहे',
    'Could not save the admission': 'प्रवेश सेव्ह होऊ शकला नाही',
    'Demo school loaded': 'नमुना स्कूल लोड झाला',
    'Demo data restored': 'नमुना डेटा परत आणला',
    'Password reset will be available soon': 'पासवर्ड रीसेट लवकरच उपलब्ध होईल',
    'Reminder settings — next': 'स्मरणपत्र सेटिंग्ज — पुढील टप्पा',
    'Privacy controls — next': 'गोपनीयता नियंत्रण — पुढील टप्पा',
    'Support: hello@drivedesk.in': 'सहाय्य: hello@drivedesk.in',
    'Reset demo data?': 'नमुना डेटा रीसेट करायचा?',
    'All students, sessions and admissions you added will be removed and the sample school restored.': 'तुम्ही जोडलेले सर्व विद्यार्थी, क्लासेस व प्रवेश काढले जातील आणि नमुना स्कूल परत आणला जाईल.',
    'Reset demo': 'रीसेट करा',
    'Log out?': 'लॉगआउट करायचा?',
    'You can sign back in with the demo account any time.': 'तुम्ही कधीही नमुना खात्याने पुन्हा लॉगिन करू शकता.',

    /* validation (fields) */
    'Enter the student name.': 'विद्यार्थ्याचे नाव टाका.',
    'Enter a valid 10-digit mobile number.': 'योग्य दहा अंकी मोबाईल नंबर टाका.',
    'Enter the student address.': 'विद्यार्थ्याचा पत्ता टाका.',
    'Pick a class timing.': 'क्लासची वेळ निवडा.',
    'Enter between 1 and 90 classes.': '1 ते 90 क्लासेस टाका.',
    'Pick a start date.': 'सुरू होण्याची तारीख निवडा.',
    'Enter the total course fee.': 'कोर्सची एकूण फी टाका.',
    'Paid amount cannot be more than the total.': 'भरलेली रक्कम एकूण रक्कमपेक्षा जास्त असू शकत नाही.',
    'Enter the licence number.': 'लायसन्स नंबर टाका.',
    'Empty mobile': 'मोबाईल टाका'
  };

  /* dynamic sentences — regex over the whole text node */
  const MR_PATTERNS = [
    { re: /^Good (morning|afternoon|evening)\b(.*)$/, fn: (m) => ({ morning: 'शुभ सकाळ', afternoon: 'शुभ दुपार', evening: 'शुभ संध्याकाळ' }[m[1]]) + m[2] },
    { re: /^(.+?) · (\d+) days? left$/, fn: (m) => `${m[1]} · उर्वरित ${m[2]} दिवस` },
    { re: /^(\d+) days? left · renews? on (.+)$/, fn: (m) => `उर्वरित ${m[1]} दिवस · ${m[2]} ला नूतनीकरण` },
    { re: /^Step (\d+) of (\d+)$/, fn: (m) => `पायरी ${m[1]} / ${m[2]}` },
    { re: /^(\d+) students? with a balance$/, fn: (m) => `${m[1]} विद्यार्थ्याकडे फी बाकी` },
    { re: /^(\d+) instructors? · (\d+) vehicles$/, fn: (m) => `${m[1]} प्रशिक्षक · ${m[2]} वाहने` },
    { re: /^Course names must be unique\. (.+) is repeated\.$/, fn: (m) => `कोर्सची नावे वेगळी असावीत. "${m[1]}" हे नाव पुन्हा आहे.` },
    { re: /^Enter a valid fee per class for (.+)\.$/, fn: (m) => `${m[1]} साठी प्रति क्लास योग्य फी टाका.` },
    { re: /^Default classes for (.+) must be between 1 and 90\.$/, fn: (m) => `${m[1]} साठी डीफॉल्ट क्लासेस 1 ते 90 असाव्यात.` },
    { re: /^Remove (.+)$/, fn: (m) => `${m[1]} काढून टाका` },
    { re: /^(\d+) students?$/, fn: (m) => `${m[1]} विद्यार्थी` },
    { re: /^Enter a whole number from 1 to (\d+)\.$/, fn: (m) => `1 ते ${m[1]} एवढा पूर्णांक टाका.` },
    { re: /^Will mark (\d+) classes: Session (\d+) to Session (\d+)\.$/, fn: (m) => `आज ${m[2]} ते ${m[3]} क्रमांकाच्या ${m[1]} क्लासेस नोंदवल्या जातील.` },
    { re: /^Mark (\d+) classes$/, fn: (m) => `${m[1]} क्लासेस नोंदवा` },
    { re: /^(\d+) classes?$/, fn: (m) => `${m[1]} ${m[1] === '1' ? 'क्लास' : 'क्लासेस'}` },
    { re: /^(\d+) classes · fee (.+)$/, fn: (m) => `फी ${m[2]} · ${m[1]} क्लासेस` },
    { re: /^(.*?) per class · default (\d+) classes$/, fn: (m) => `प्रति क्लास ${m[1]} · डीफॉल्ट ${m[2]} क्लासेस` },
    { re: /^Auto-filled: (\d+) classes × (.*?) per class = (.+?)\. Edit if you agreed a different fee\.$/, fn: (m) => `स्वयं भरले: ${m[1]} क्लासेस × प्रति क्लास ${m[2]} = ${m[3]}. करारात वेगळी रक्कम असल्यास बदला.` },
    { re: /^Prefilled from (.+?) — (\d+) classes\. Edit if you agreed a different fee\.$/, fn: (m) => `${m[1]} — ${m[2]} क्लासेस आधारित. करारात वेगळी रक्कम असल्यास बदला.` },
    { re: /^Session (\d+) · (.+)$/, fn: (m) => `क्लास ${m[1]} · ${m[2]}` },
    { re: /^(.+) — Student agreement$/, fn: (m) => `${m[1]} — विद्यार्थी संमतीपत्र` },
    { re: /^(₹[\d,.]+) of (₹[\d,.]+)$/, fn: (m) => `${m[2]} पैकी ${m[1]}` },
    { re: /^Welcome back, (.+)$/, fn: (m) => `पुन्हा स्वागत आहे, ${m[1]}` },
    { re: /^Admission completed - (.+)$/, fn: (m) => `प्रवेश पूर्ण - ${m[1]}` },
    { re: /^Payment of (.+?) recorded$/, fn: (m) => `${m[1]} रक्कम नोंदवली` },
    { re: /^Enter an amount between (.+) and (.+)$/, fn: (m) => `${m[1]} ते ${m[2]} रक्कम टाका` },
    { re: /^Will mark Session (\d+) today\.$/, fn: (m) => `आजचे क्लास ${m[1]} या क्रमांकाने नोंदवली जाईल.` },
    { re: /^(\d+) class(es)? · (.+)$/, fn: (m) => `${m[1]} ${m[1] === '1' ? 'क्लास' : 'क्लासेस'} · ${m[3]}` },
    { re: /^(\d+) day(s)? left$/, fn: (m) => `उर्वरित ${m[1]} दिवस` },
    { re: /^(\d+) of (\d+) classes?$/, fn: (m) => `${m[2]} पैकी ${m[1]}` },
    { re: /^(\d+) (\d+) done$/, fn: (m) => `${m[1]}/${m[2]} पूर्ण` }
  ];

  const norm = (s) => String(s).trim().replace(/\s+/g, ' ');

  function current() {
    let lang = null;
    try {
      lang = window.localStorage.getItem(KEY);
    } catch (err) {
      lang = null;
    }
    return LANGS.some((l) => l.code === lang) ? lang : 'en';
  }

  function set(lang) {
    if (!LANGS.some((l) => l.code === lang)) return current();
    try {
      window.localStorage.setItem(KEY, lang);
    } catch (err) {
      /* storage unavailable — language stays for the session only */
    }
    return lang;
  }

  function label() {
    const lang = current();
    const found = LANGS.find((l) => l.code === lang);
    return found ? found.label : 'English';
  }

  function t(text) {
    const raw = String(text === undefined || text === null ? '' : text);
    if (current() !== 'mr') return raw;
    const key = norm(raw);
    if (MR[key]) return MR[key];
    for (const p of MR_PATTERNS) {
      const m = key.match(p.re);
      if (m) return p.fn(m);
    }
    return raw;
  }

  const ATTRS = ['placeholder', 'aria-label', 'title'];

  function paint(node) {
    const raw = node.nodeValue;
    const value = t(raw);
    if (value !== raw) node.nodeValue = value;
  }

  function apply(root) {
    if (!root || current() !== 'mr') return;
    const walker = root.ownerDocument ? (root.createTreeWalker ? root : null) : null;
    if (walker && window.NodeFilter) {
      const tw = root.createTreeWalker(root, window.NodeFilter.SHOW_TEXT, null, false);
      let n;
      while ((n = tw.nextNode())) paint(n);
    } else if (root.querySelectorAll && root.ownerDocument) {
      Array.from(root.querySelectorAll('*')).forEach((el) => {
        if (!(el.childNodes && el.childNodes.length)) return;
        Array.from(el.childNodes).forEach((child) => {
          if (child.nodeType === 3 && child.nodeValue && child.nodeValue.trim()) paint(child);
        });
      });
    }
    if (root.querySelectorAll && root.ownerDocument) {
      Array.from(root.querySelectorAll('[' + ATTRS.join('],[') + ']')).forEach((el) => {
        ATTRS.forEach((attr) => {
          const v = el.getAttribute(attr);
          if (!v) return;
          const translated = t(v);
          if (translated !== v) el.setAttribute(attr, translated);
        });
      });
    }
  }

  window.I18N = { t, set, get: current, current, label, apply, LANGS };
})();

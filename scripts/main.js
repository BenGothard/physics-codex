const yearEl = document.querySelector('#year');
const lectureListEl = document.querySelector('#lecture-list');

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

const renderLectureList = (lectures) => {
  if (!lectureListEl) return;

  lectureListEl.innerHTML = '';
  lectures.forEach((lecture) => {
    const li = document.createElement('li');
    const sourceAnchor = document.createElement('a');
    sourceAnchor.href = `content/SOURCES.md#${lecture.source_reference.toLowerCase()}`;
    sourceAnchor.textContent = lecture.source_reference;

    li.textContent = `Vol ${lecture.volume}, Ch ${lecture.chapter}, Sec ${lecture.section}: ${lecture.title} (`;
    li.appendChild(sourceAnchor);
    li.appendChild(document.createTextNode(')'));
    lectureListEl.appendChild(li);
  });
};

const renderLectureError = () => {
  if (!lectureListEl) return;
  lectureListEl.innerHTML = '<li>Lecture references are unavailable in this preview mode.</li>';
};

const loadLectureManifest = async () => {
  if (!lectureListEl) return;
  try {
    const response = await fetch('content/lectures/v1/index.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json();
    renderLectureList(manifest.lectures || []);
  } catch (error) {
    renderLectureError();
  }
};

loadLectureManifest();

'use client'

const MissionPopupMobile = ({ mission, missionIndex, totalMissions, currency }) => {
  if (!mission) return null

  const progressPercent = mission.target ? Math.min(100, (mission.progress / mission.target) * 100) : 0

  return (
    <div className="mission-popup-mobile">
      <div className="mission-popup-mobile__handle" />
      <div className="mission-popup-mobile__header">
        <div
          className={`mission-popup-mobile__icon${mission.completed ? ' mission-popup-mobile__icon--complete' : ''}`}
          aria-hidden="true"
        >
          {mission.icon}
        </div>
        <div className="mission-popup-mobile__title-section">
          <span
            className={`mission-popup-mobile__title${mission.completed ? ' mission-popup-mobile__title--complete' : ''}`}
          >
            {mission.name}
          </span>
          <span className="mission-popup-mobile__reward">+{mission.reward}💰</span>
        </div>
      </div>

      <p className="mission-popup-mobile__description">{mission.description}</p>

      <div className="mission-popup-mobile__progress">
        <div
          className={`mission-popup-mobile__progress-bar${mission.completed ? ' mission-popup-mobile__progress-bar--complete' : ''}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mission-popup-mobile__meta">
        <span className="mission-popup-mobile__progress-text">
          {mission.progress}/{mission.target}
        </span>
        {mission.completed ? (
          <span className="mission-popup-mobile__status mission-popup-mobile__status--complete">✅ Completed</span>
        ) : (
          <span className="mission-popup-mobile__status">
            Mission {missionIndex + 1}/{totalMissions}
          </span>
        )}
      </div>

      <div className="mission-popup-mobile__footer">
        <div className="mission-popup-mobile__footer-item">
          <span className="mission-popup-mobile__footer-label">Mission</span>
          <span className="mission-popup-mobile__footer-value">
            {missionIndex + 1}/{totalMissions}
          </span>
        </div>
        <div className="mission-popup-mobile__footer-item">
          <span className="mission-popup-mobile__footer-label">Wallet</span>
          <span className="mission-popup-mobile__footer-value">💰 {currency}</span>
        </div>
      </div>
    </div>
  )
}

export default MissionPopupMobile

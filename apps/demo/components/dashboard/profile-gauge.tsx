import { formatPercent } from "@/lib/dashboard/formatters";
import type { Profile } from "@/lib/dashboard/types";

import styles from "./dashboard.module.css";

type ProfileGaugeProps = {
  profile: Profile;
};

const PROFILE_ROWS: Array<{
  key: keyof Profile;
  label: string;
  colorClass: string;
}> = [
  { key: "motor", label: "Motor", colorClass: styles.profileBarMotor },
  { key: "visual", label: "Visual", colorClass: styles.profileBarVisual },
  {
    key: "cognitive",
    label: "Cognitive",
    colorClass: styles.profileBarCognitive,
  },
];

export function ProfileGauge({ profile }: ProfileGaugeProps) {
  return (
    <section className={styles.panel} aria-labelledby="profile-title">
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.sectionHeading} id="profile-title">
            <span className={styles.sectionIcon} aria-hidden="true" />
            User profile
          </h2>
          <p className={styles.panelHint}>Rule-layer friction scores · threshold 60%</p>
        </div>
      </div>

      <div className={styles.panelBody}>
        <div className={styles.profileList}>
          {PROFILE_ROWS.map(({ key, label, colorClass }) => {
            const value = profile[key];

            return (
              <div className={styles.profileRow} key={key}>
                <div className={styles.profileMeta}>
                  <span className={styles.profileLabel}>{label}</span>
                  <span className={styles.profileValue}>{formatPercent(value)}</span>
                </div>
                <div className={styles.profileTrack}>
                  <div
                    className={`${styles.profileBar} ${colorClass}`}
                    style={{ width: `${Math.min(100, value * 100)}%` }}
                  />
                  <span className={styles.threshold} aria-hidden="true" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
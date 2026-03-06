import styles from "@/components/b2b/B2bUx.module.css";

type EmployeeReportAdminOnlyGateProps = {
  badgeLabel: string;
  title: string;
  description: string;
  contactEmail: string;
};

export default function EmployeeReportAdminOnlyGate(
  props: EmployeeReportAdminOnlyGateProps
) {
  return (
    <section className={styles.adminOnlyGateCard}>
      <span className={styles.adminOnlyGateBadge}>{props.badgeLabel}</span>
      <h2 className={styles.adminOnlyGateTitle}>{props.title}</h2>
      <p className={styles.adminOnlyGateDescription}>{props.description}</p>
      <a href={`mailto:${props.contactEmail}`} className={styles.adminOnlyGateEmail}>
        {props.contactEmail}
      </a>
    </section>
  );
}

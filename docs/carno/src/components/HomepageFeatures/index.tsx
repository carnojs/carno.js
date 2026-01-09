import type { ReactNode } from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  emoji: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Bun Native Performance',
    emoji: '⚡',
    description: (
      <>
        Built from the ground up for Bun runtime. Zero abstraction overhead,
        JIT-compiled handlers, and radix tree routing for maximum speed.
      </>
    ),
  },
  {
    title: 'Developer Experience',
    emoji: '✨',
    description: (
      <>
        TypeScript decorators, powerful dependency injection, Zod validation,
        and clean APIs that scale with your project.
      </>
    ),
  },
  {
    title: 'Complete Ecosystem',
    emoji: '🔧',
    description: (
      <>
        Full-featured ORM, background jobs with BullMQ, cron scheduling,
        and CLI tools — everything you need in one place.
      </>
    ),
  },
  {
    title: 'Type-Safe ORM',
    emoji: '🔒',
    description: (
      <>
        PostgreSQL & MySQL support with smart identity map, lazy loading,
        transactions, and migrations out of the box.
      </>
    ),
  },
  {
    title: 'Plugin Architecture',
    emoji: '🧩',
    description: (
      <>
        Modular design with independent packages. Use only what you need,
        extend easily, and keep your bundle lean.
      </>
    ),
  },
  {
    title: 'Production Ready',
    emoji: '🚀',
    description: (
      <>
        CORS, middleware, lifecycle hooks, testing utilities, and
        comprehensive documentation for real-world apps.
      </>
    ),
  },
];

function Feature({ title, emoji, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className={styles.featureCard}>
        <div className={styles.featureEmoji}>{emoji}</div>
        <Heading as="h3" className={styles.featureTitle}>{title}</Heading>
        <p className={styles.featureDescription}>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>Why Choose Carno.js?</Heading>
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

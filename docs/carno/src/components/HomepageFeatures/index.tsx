import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Performance-first by default',
    description: (
      <>
        Carno.js is built for Bun and focuses on fast request handling, minimal
        overhead, and efficient data access.
      </>
    ),
  },
  {
    title: 'Developer-friendly APIs',
    description: (
      <>
        Decorators, DI, validation, and modules are designed to be simple to read
        and easy to extend as your project grows.
      </>
    ),
  },
  {
    title: 'Batteries included',
    description: (
      <>
        Use the ORM, queues, and scheduling plugins to cover the most common
        backend needs without introducing extra frameworks.
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

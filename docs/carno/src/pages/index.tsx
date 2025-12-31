﻿import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContent}>
          <div>
            <p className={styles.heroKicker}>Performance-first framework + ORM for Bun</p>
            <div className={styles.heroTitleRow}>
              <img
                className={styles.heroImage}
                src={useBaseUrl('/img/carno.png')}
                alt="Carno.js logo"
              />
              <Heading as="h1" className={styles.heroTitle}>
                {siteConfig.title}
              </Heading>
            </div>
            <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
            <ul className={styles.heroHighlights}>
              <li>Zero-config routing and DI</li>
              <li>Type-safe ORM with smart identity map</li>
              <li>Fast builds, fast runtime</li>
            </ul>
            <div className={styles.buttons}>
              <Link className="button button--primary button--lg" to="/docs/intro">
                Read the docs
              </Link>
              <Link className="button button--secondary button--lg" to="/docs/installation">
                Install
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} Documentation`}
      description="Carno.js: performance-first framework and ORM for Bun + TypeScript.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}

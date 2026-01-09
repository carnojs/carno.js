﻿import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContent}>
          <div>
            <p className={styles.heroKicker}>⚡ The fastest framework for Bun</p>
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
              <li>🚀 234k requests/sec — 40% faster than alternatives</li>
              <li>💉 Zero-config routing and powerful DI</li>
              <li>🔒 Type-safe ORM with smart identity map</li>
            </ul>
            <div className={styles.buttons}>
              <Link className="button button--primary button--lg" to="/docs/intro">
                Get Started →
              </Link>
              <Link className="button button--secondary button--lg" to="/docs/benchmark">
                See Benchmarks
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function BenchmarkSection() {
  return (
    <section className={styles.benchmarkSection}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>⚡ Blazing Fast Performance</Heading>
        <p className={styles.sectionSubtitle}>Benchmarked and proven — Carno.js leads the pack</p>
        <div className={styles.benchmarkCards}>
          <div className={clsx(styles.benchmarkCard, styles.carnoCard)}>
            <div className={styles.benchmarkBadge}>🥇 Winner</div>
            <h3>Carno.js</h3>
            <div className={styles.benchmarkNumber}>234,562</div>
            <div className={styles.benchmarkLabel}>requests/sec</div>
            <div className={styles.benchmarkStats}>
              <span>⚡ 0.21ms avg</span>
              <span>🎯 100% success</span>
            </div>
          </div>
          <div className={styles.benchmarkCard}>
            <h3>Elysia</h3>
            <div className={styles.benchmarkNumber}>167,206</div>
            <div className={styles.benchmarkLabel}>requests/sec</div>
            <div className={styles.benchmarkStats}>
              <span>⚡ 0.29ms avg</span>
              <span>🎯 100% success</span>
            </div>
          </div>
        </div>
        <div className={styles.benchmarkCta}>
          <Link className="button button--outline button--primary" to="/docs/benchmark">
            View Full Benchmark Results →
          </Link>
        </div>
      </div>
    </section>
  );
}

function InstallSection() {
  return (
    <section className={styles.installSection}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>🚀 Get Started in Seconds</Heading>
        <div className={styles.installCode}>
          <code>bun add @carno.js/core</code>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} Documentation`}
      description="Carno.js: performance-first framework and ORM for Bun + TypeScript.">
      <HomepageHeader />
      <main>
        <BenchmarkSection />
        <HomepageFeatures />
        <InstallSection />
      </main>
    </Layout>
  );
}

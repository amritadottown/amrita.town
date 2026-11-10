<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:atom="http://www.w3.org/2005/Atom"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	exclude-result-prefixes="atom dc">

	<xsl:output method="html" encoding="utf-8" indent="yes" />

	<!-- feed.xsl — browser view for /rss.xml, /atom.xml and /opml.xml. -->
	<!-- one sheet, three shapes: rss 2.0, atom 1.0, opml 2.0. -->
	<!-- brand: six tokens, system-ui, lowercase voice, pixelated logo. -->

	<xsl:template match="/">
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title><xsl:value-of select="rss/channel/title | atom:feed/atom:title | opml/head/title" /> — amrita.town</title>
				<style>
					<![CDATA[
	:root {
		font-family: system-ui, monospace;
		color-scheme: light dark;

		/* light scheme */
		--base: #faf7f0;
		--text: #000000d0;
		--secondary: #00000025;
		--secondary-light: #767676;
		--tertiary: #00000008;
		--accent: #ae0c3e;
	}

	@media (prefers-color-scheme: dark) {
		:root {
			--base: #181818;
			--text: #ffffffe0;
			--secondary: #ffffff30;
			--secondary-light: #7a7a7a;
			--tertiary: #ffffff09;
			--accent: #e0527a;
		}
	}

	@media (color-gamut: p3) {
		:root {
			--accent: oklch(52.63% 0.187 13.42);
		}
		@media (prefers-color-scheme: dark) {
			:root {
				--accent: oklch(66.45% 0.2344 6.44);
			}
		}
	}

	* {
		box-sizing: border-box;
	}

	html {
		background-color: var(--base);
		text-size-adjust: none;
		-moz-text-size-adjust: none;
		-webkit-text-size-adjust: none;
	}

	body {
		background-color: var(--base);
		color: var(--text);
		line-height: 1.72;
		margin: 2rem auto;
		width: min(85%, 90ch);
		text-transform: lowercase;
	}

	h1 {
		font-size: 2.4rem;
		font-weight: 600;
		line-height: 1.25;
		margin-block: 0.66em;
	}

	p {
		margin-block-end: 1rem;
	}

	a {
		color: var(--accent);
	}

	.site-header {
		margin-block-end: 0;
	}

	.logo-link {
		display: inline-block;
	}

	/* never recolour or filter the mark; keep S/8 clear space at S = 32px */
	.logo {
		display: block;
		width: 32px;
		height: 32px;
		margin: 0.25rem;
		image-rendering: pixelated;
	}

	.meta,
	.feed-description,
	.post-author,
	.post-date,
	.post-description,
	.member-feed,
	.site-footer {
		color: var(--secondary-light);
	}

	.meta {
		margin-block-end: 1.5rem;
	}

	.zone {
		font-size: 0.85rem;
	}

	.post-list,
	.member-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.post-item,
	.member-item {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 0.75rem;
		padding-block: 0.6rem;
	}

	.post-item + .post-item,
	.member-item + .member-item {
		border-top: 1px solid var(--secondary);
	}

	.post-title {
		width: 100%;
		font-weight: 500;
	}

	.post-description {
		width: 100%;
		margin: 0;
	}

	.member-name {
		font-weight: 600;
	}

	.member-feed {
		font-size: 0.85rem;
		overflow-wrap: anywhere;
	}

	@media (min-width: 600px) {
		.post-title {
			width: auto;
		}

		.post-date {
			margin-left: auto;
		}
	}

	/* proper nouns stay legible: titles, names, descriptions and dates opt out */
	.post-title,
	.post-author,
	.post-description,
	.post-date,
	.member-name {
		text-transform: none;
	}

	.empty {
		color: var(--secondary-light);
		font-style: italic;
	}

	.site-footer {
		margin-block-start: 3rem;
		padding-block-start: 1rem;
		border-top: 1px solid var(--secondary);
	}

	.site-footer p {
		margin: 0;
	}
					]]>
				</style>
			</head>
			<body>
				<header class="site-header">
					<a class="logo-link" href="https://amrita.town">
						<img class="logo" src="/favicon.png" alt="amrita.town" width="32" height="32" />
					</a>
				</header>
				<main>
					<xsl:apply-templates select="rss/channel | atom:feed | opml/body" mode="feed" />
				</main>
				<footer class="site-footer">
					<p><a href="https://amrita.town">amrita.town</a> · <a href="https://amrita.town/blogroll">blogroll</a></p>
				</footer>
			</body>
		</html>
	</xsl:template>

	<!-- shared title line: format and item count -->
	<xsl:template name="heading">
		<xsl:param name="title" />
		<xsl:param name="format" />
		<xsl:param name="count" />
		<xsl:param name="noun" />
		<xsl:param name="ist" select="false()" />
		<h1><xsl:value-of select="$title" /></h1>
		<p class="meta">
			<xsl:value-of select="$format" />
			<xsl:text> · </xsl:text>
			<xsl:value-of select="$count" />
			<xsl:text> </xsl:text>
			<xsl:choose>
				<xsl:when test="$count = 1"><xsl:value-of select="$noun" /></xsl:when>
				<xsl:otherwise><xsl:value-of select="$noun" />s</xsl:otherwise>
			</xsl:choose>
			<xsl:if test="$ist">
				<xsl:text> · </xsl:text>
				<span class="zone">times in ist</span>
			</xsl:if>
		</p>
	</xsl:template>

	<!-- rss 2.0 -->
	<xsl:template match="rss/channel" mode="feed">
		<xsl:call-template name="heading">
			<xsl:with-param name="title" select="title" />
			<xsl:with-param name="format" select="'rss 2.0'" />
			<xsl:with-param name="count" select="count(item)" />
			<xsl:with-param name="noun" select="'post'" />
			<xsl:with-param name="ist" select="true()" />
		</xsl:call-template>
		<xsl:if test="description">
			<p class="feed-description"><xsl:value-of select="description" /></p>
		</xsl:if>
		<xsl:choose>
			<xsl:when test="item">
				<ul class="post-list">
					<xsl:apply-templates select="item" mode="entry" />
				</ul>
			</xsl:when>
			<xsl:otherwise>
				<p class="empty">no posts yet</p>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>

	<xsl:template match="item" mode="entry">
		<li class="post-item">
			<a class="post-title" href="{link}"><xsl:value-of select="title" /></a>
			<xsl:if test="dc:creator">
				<span class="post-author"><xsl:value-of select="dc:creator" /></span>
			</xsl:if>
			<xsl:if test="pubDate">
				<span class="post-date"><xsl:value-of select="pubDate" /></span>
			</xsl:if>
			<xsl:if test="description">
				<p class="post-description"><xsl:value-of select="description" /></p>
			</xsl:if>
		</li>
	</xsl:template>

	<!-- atom 1.0 -->
	<xsl:template match="atom:feed" mode="feed">
		<xsl:call-template name="heading">
			<xsl:with-param name="title" select="atom:title" />
			<xsl:with-param name="format" select="'atom 1.0'" />
			<xsl:with-param name="count" select="count(atom:entry)" />
			<xsl:with-param name="noun" select="'post'" />
			<xsl:with-param name="ist" select="true()" />
		</xsl:call-template>
		<xsl:if test="atom:subtitle">
			<p class="feed-description"><xsl:value-of select="atom:subtitle" /></p>
		</xsl:if>
		<xsl:choose>
			<xsl:when test="atom:entry">
				<ul class="post-list">
					<xsl:apply-templates select="atom:entry" mode="entry" />
				</ul>
			</xsl:when>
			<xsl:otherwise>
				<p class="empty">no posts yet</p>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>

	<xsl:template match="atom:entry" mode="entry">
		<li class="post-item">
			<a class="post-title" href="{atom:link[@rel='alternate']/@href}"><xsl:value-of select="atom:title" /></a>
			<xsl:if test="atom:author/atom:name">
				<span class="post-author"><xsl:value-of select="atom:author/atom:name" /></span>
			</xsl:if>
			<xsl:if test="atom:published | atom:updated">
				<span class="post-date">
					<xsl:choose>
						<xsl:when test="atom:published"><xsl:value-of select="atom:published" /></xsl:when>
						<xsl:otherwise><xsl:value-of select="atom:updated" /></xsl:otherwise>
					</xsl:choose>
				</span>
			</xsl:if>
			<xsl:if test="atom:summary">
				<p class="post-description"><xsl:value-of select="atom:summary" /></p>
			</xsl:if>
		</li>
	</xsl:template>

	<!-- opml 2.0 -->
	<xsl:template match="opml/body" mode="feed">
		<xsl:call-template name="heading">
			<xsl:with-param name="title" select="../head/title" />
			<xsl:with-param name="format" select="'opml 2.0'" />
			<xsl:with-param name="count" select="count(outline)" />
			<xsl:with-param name="noun" select="'feed'" />
		</xsl:call-template>
		<xsl:choose>
			<xsl:when test="outline">
				<ul class="member-list">
					<xsl:apply-templates select="outline" mode="member" />
				</ul>
			</xsl:when>
			<xsl:otherwise>
				<p class="empty">no feeds yet</p>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>

	<xsl:template match="outline" mode="member">
		<li class="member-item">
			<a class="member-name" href="{@htmlUrl}">
				<xsl:choose>
					<xsl:when test="@text"><xsl:value-of select="@text" /></xsl:when>
					<xsl:otherwise><xsl:value-of select="@title" /></xsl:otherwise>
				</xsl:choose>
			</a>
			<span class="member-feed"><xsl:value-of select="@xmlUrl" /></span>
		</li>
	</xsl:template>

</xsl:stylesheet>

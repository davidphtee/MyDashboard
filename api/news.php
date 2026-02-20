<?php
header('Content-Type: application/json');

$page = $_GET['page'] ?? '101';

$feeds = [
    "101" => "https://feeds.bbci.co.uk/news/rss.xml",
    "102" => "https://feeds.bbci.co.uk/news/uk/rss.xml",
    "103" => "https://feeds.bbci.co.uk/news/world/rss.xml",
    "104" => "https://feeds.bbci.co.uk/news/england/rss.xml",
    "105" => "https://feeds.bbci.co.uk/news/scotland/rss.xml",
    "106" => "https://feeds.bbci.co.uk/news/wales/rss.xml",
    "107" => "https://feeds.bbci.co.uk/news/northern_ireland/rss.xml",
    "108" => "https://feeds.bbci.co.uk/news/world/africa/rss.xml",
    "109" => "https://feeds.bbci.co.uk/news/world/asia/rss.xml",
    "110" => "https://feeds.bbci.co.uk/news/world/europe/rss.xml",
    "111" => "https://feeds.bbci.co.uk/news/world/latin_america/rss.xml",
    "112" => "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
    "113" => "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml",
    "114" => "https://feeds.bbci.co.uk/news/business/rss.xml",
    "115" => "https://feeds.bbci.co.uk/news/politics/rss.xml",
    "116" => "https://feeds.bbci.co.uk/news/health/rss.xml",
    "117" => "https://feeds.bbci.co.uk/news/education/rss.xml",
    "118" => "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    "119" => "https://feeds.bbci.co.uk/news/technology/rss.xml",
    "120" => "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
    "121" => "https://feeds.bbci.co.uk/sport/rss.xml",
    "122" => "https://weather-broker-cdn.api.bbci.co.uk/en/forecast/rss/3day/1273833",
    "136" => "https://feeds.bbci.co.uk/sport/rugby-union/rss.xml",
    "137" => "https://feeds.bbci.co.uk/sport/tennis/rss.xml",
    "138" => "https://feeds.bbci.co.uk/sport/cricket/rss.xml",
    "139" => "https://feeds.bbci.co.uk/sport/snooker/rss.xml",
    "140" => "https://feeds.bbci.co.uk/sport/winter-olympics/rss.xml",
];


if (!isset($feeds[$page])) {
  echo json_encode(['error' => 'Invalid page code.']);
  exit;
}

$rss_url = $feeds[$page];
$rss = @simplexml_load_file($rss_url);

if (!$rss) {
  echo json_encode(['error' => 'Failed to load RSS feed.']);
  exit;
}

$pageData['title'] = (string) $rss->channel->title;
$pageData['description'] = (string) $rss->channel->description;
$pageData['link'] = (string) $rss->channel->link;
$pageData['language'] = (string) $rss->channel->language;
$pageData['copyright'] = (string) $rss->channel->copyright;
$pageData['pubDate'] = (string) $rss->channel->pubDate;
$pageData['lastBuildDate'] = (string) $rss->channel->lastBuildDate;

$items = [];
foreach ($rss->channel->item as $item) {
  $items[] = [
    'title' => (string) $item->title,
    'link' => (string) $item->link,
    'pubDate' => (string) $item->pubDate,
    'description' => strip_tags((string) $item->description)
  ];
}

echo json_encode([
  'page' => $page,
//   'items' => array_slice($items, 0, 10), // limit output
  'items' => $items,
  'pageData' => $pageData
]);

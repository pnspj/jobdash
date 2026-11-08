#!/bin/sh
# Render the landing page's OGP image and touch icon from the HTML sources here, with headless Chrome (macOS).
set -eu
cd "$(dirname "$0")"
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
PROFILE=$(mktemp -d)
trap 'rm -rf "$PROFILE"' EXIT

render() { # <html> <output png> <width> <height>
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$PROFILE" \
    --window-size="$3,$4" --screenshot="$PWD/$2" "file://$PWD/$1" >/dev/null 2>&1
}

render ogp.html ../../site/images/ogp.png 1200 630
render touch-icon.html ../../site/apple-touch-icon.png 180 180

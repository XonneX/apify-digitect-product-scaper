{
  description = "Development flake for digitec product scraper";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.11";
  };

  outputs =
    { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages."${system}";

      browsers = (builtins.fromJSON (builtins.readFile "${pkgs.playwright-driver}/browsers.json")).browsers;

      chromium-rev = (builtins.head (builtins.filter (x: x.name == "chromium") browsers)).revision;
    in
    {
      devShells."${system}".default = pkgs.mkShellNoCC {
        packages = with pkgs; [
          just
          nodejs
        ];

        # shellHook =
        #   git config --local core.hooksPath .githooks/
        #   mkdir -p .direnv
        #   ln -sfn "${pkgs.php85}/bin/php" .direnv/php
        #   ln -sfn "${pkgs.php85Packages.composer}/bin/composer" .direnv/composer
        # ;

        env = {
            PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1;
            PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright.browsers}";
            PLAYWRIGHT_NODEJS_PATH = "${pkgs.nodejs}/bin/node";
            PLAYWRIGHT_LAUNCH_OPTIONS_EXECUTABLE_PATH = "${pkgs.playwright.browsers}/chromium-${chromium-rev}/chrome-linux/chrome";
        };

        shellHook = ''
          playwrightNpmVersion=$(node -p "require('playwright/package.json').version" 2>/dev/null || true)
          nixPlaywrightBaseVersion=$(echo "${pkgs.playwright.version}" | cut -d. -f1,2)
          npmPlaywrightBaseVersion=$(echo "$playwrightNpmVersion" | cut -d. -f1,2)

          echo "❄️ Playwright nix version: ${pkgs.playwright.version}"
          echo "📦 Playwright npm version: $playwrightNpmVersion"

          if [ -n "$playwrightNpmVersion" ] && [ "$nixPlaywrightBaseVersion" != "$npmPlaywrightBaseVersion" ]; then
              echo "❌ Playwright versions differ: nix=$nixPlaywrightBaseVersion npm=$npmPlaywrightBaseVersion"
          elif [ -n "$playwrightNpmVersion" ]; then
              echo "✅ Playwright versions in nix and npm are compatible"
          else
              echo "⚠️ Could not detect npm Playwright version yet. Run npm install first."
          fi

          echo
          env | grep ^PLAYWRIGHT || true
        '';
      };
    };
}


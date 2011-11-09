<?php

/**
 * creates the dist version of JNode
 * 
 * just execute it and you're done
 */
 
print "\nErstelle jquerystring.js in /dist ... ";

$dist = fopen(__DIR__ . '/dist/jquerystring.js', 'w');
build($dist, 'jquerystring.js');
fclose($dist);

print "\n\njnode.js wurde erfolgreich erstellt!\n\n---\n\nVerarbeite weitere Module ...\n\n";

// edit path
$yui = 'D:/Coding/YUI Compressor/build/yuicompressor-2.4.6.jar';
apply_yui($yui);

// edit path
$jdoc = 'D:/Coding/jsdoc-toolkit';
//apply_jdoc($jdoc);

// ------------------------------

function apply_jdoc($path) {
  print "Pruefe auf JSDoc im angegebenen Pfad:\n{$path}/jsrunner.jar ... \n\n";
  
  if (!file_exists($path . '/jsrun.jar')) {
    print "-> Modul nicht gefunden!\n\n";
    return;
  }
  
  print '-> Erstelle Dokumenation in ' . __DIR__ . "/doc\n";
  
  $cmd = 'java -jar "' . $path . '/jsrun.jar"  "' . $path . '/app/run.js" -a -d="' 
    . __DIR__ . '/doc" -t="' . $path . '/templates/jsdoc" "' . __DIR__ . '/dist/jnode.js"';
    
  `$cmd >> nul`;
  
  print "-> Dokumenation wurde erfolgreich erstellt!\n\n";
}

function apply_yui($path) {
  print "Pruefe auf YUI-Compressor im angegebenen Pfad:\n{$path} ... \n\n";
  
  if (!file_exists($path)) {
    print "-> Modul nicht gefunden!\n\n";
    return;
  }
  
  print '-> Minimiere Code nach ' . __DIR__ . "/dist/jquerystring.min.js\n";
  
  $cmd = 'java -jar "' . $path . '" -o "' . __DIR__ 
    . '/dist/jquerystring.min.js" "' . __DIR__ . '/dist/jquerystring.js"';
    
  `$cmd >> nul`;
  
  print "-> Code wurde erfolgreich minimiert!\n\n";
}

function build($dist, $file) {   
  $file = __DIR__ . '/src/' . $file;
  
  print "\n\nVerarbeite: {$file}";
  
  if (!file_exists($file))
    return;
    
  foreach (file($file) as $line) {
    $trim = trim($line);
    
    if (substr($trim, 0, 3) === '//@') {
      $split = explode(' ', substr($trim, 3));
      
      if (empty($split))
        continue;
        
      switch ($split[0]) {
        case 'require':
          print "\n-> @require ({$split[1]})";
          $line = build($dist, $split[1]);
          break;
      }
    }
    
    fwrite($dist, $line);
  }
}


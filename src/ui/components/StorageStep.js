/**
 * Storage Step Component - Storage configuration for memory, cache, and sql
 */
function StorageStep(React, Box, Text, { 
  memory = '', 
  cache = '', 
  sql = '', 
  selectedMemoryIndex = 0, 
  selectedCacheIndex = 0, 
  selectedSqlIndex = 0, 
  currentStorageType = 'memory', 
  isCompleted = false 
}) {
    const storageOptions = {
      memory: [
        { name: 'faiss-local', description: 'Local vector storage' },
        { name: 'none', description: 'No vector storage' }
      ],
      cache: [
        { name: 'in-memory', description: 'Memory-based cache' },
        { name: 'redis', description: 'Redis cache server' }
      ],
      sql: [
        { name: 'sqlite', description: 'Local SQLite database' },
        { name: 'none', description: 'No SQL database' }
      ]
    };
    
    const getCurrentOptions = () => storageOptions[currentStorageType] || [];
    const getCurrentIndex = () => {
      switch (currentStorageType) {
        case 'memory': return selectedMemoryIndex;
        case 'cache': return selectedCacheIndex;
        case 'sql': return selectedSqlIndex;
        default: return 0;
      }
    };
    
    const getCurrentValue = () => {
      switch (currentStorageType) {
        case 'memory': return memory;
        case 'cache': return cache;
        case 'sql': return sql;
        default: return '';
      }
    };
    
    const getStorageIcon = (type) => {
      switch (type) {
        case 'memory': return '🧠';
        case 'cache': return '⚡';
        case 'sql': return '🗄️';
        default: return '💾';
      }
    };
    
    const getStorageTitle = (type) => {
      switch (type) {
        case 'memory': return 'Vector Storage';
        case 'cache': return 'Cache Layer';
        case 'sql': return 'SQL Database';
        default: return 'Storage';
      }
    };
    
    return React.createElement(Box, { key: 'step9', flexDirection: 'column', marginTop: 2 }, [
      React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, '💾 Step 9: Storage Configuration'),
      React.createElement(Text, { key: 'step-description', color: 'white', marginTop: 1 }, 'Configure your storage layers'),
      
      // Show completed configuration or interactive selection
      isCompleted ? React.createElement(Box, { key: 'step-value', marginTop: 1, flexDirection: 'column' }, [
        React.createElement(Text, { key: 'storage-label', color: '#71f2af', bold: true }, 'Storage Configuration:'),
        React.createElement(Text, { key: 'memory-value', color: 'white', marginLeft: 2 }, `🧠 Memory: ${memory}`),
        React.createElement(Text, { key: 'cache-value', color: 'white', marginLeft: 2 }, `⚡ Cache: ${cache}`),
        React.createElement(Text, { key: 'sql-value', color: 'white', marginLeft: 2 }, `🗄️ SQL: ${sql}`)
      ]) : React.createElement(Box, { key: 'step-config', flexDirection: 'column', marginTop: 1 }, [
        
        // Storage type navigation
        React.createElement(Box, { key: 'storage-nav', flexDirection: 'row', marginTop: 1 }, [
          React.createElement(Text, { key: 'nav-label', color: '#71f2af', bold: true }, 'Configure: '),
          React.createElement(Text, { 
            key: 'nav-memory', 
            color: currentStorageType === 'memory' ? '#71f2af' : '#c8c8c84d',
            bold: currentStorageType === 'memory',
            marginLeft: 1
          }, '🧠 Memory'),
          React.createElement(Text, { 
            key: 'nav-cache', 
            color: currentStorageType === 'cache' ? '#71f2af' : '#c8c8c84d',
            bold: currentStorageType === 'cache',
            marginLeft: 2
          }, '⚡ Cache'),
          React.createElement(Text, { 
            key: 'nav-sql', 
            color: currentStorageType === 'sql' ? '#71f2af' : '#c8c8c84d',
            bold: currentStorageType === 'sql',
            marginLeft: 2
          }, '🗄️ SQL'),
        ]),
        
        // Current storage type selection
        React.createElement(Box, { key: 'current-storage', flexDirection: 'column', marginTop: 2 }, [
          React.createElement(Text, { key: 'storage-type-title', color: '#71f2af', bold: true }, 
            `${getStorageIcon(currentStorageType)} ${getStorageTitle(currentStorageType)}:`
          ),
          React.createElement(Text, { key: 'storage-instructions', color: '#c8c8c84d', marginTop: 1 }, 
            'Use arrow keys to select, Enter to confirm'
          ),
          
          // Options for current storage type
          React.createElement(Box, { key: 'storage-options', flexDirection: 'column', marginTop: 1 }, 
            getCurrentOptions().map((option, index) => {
              const isSelected = getCurrentIndex() === index;
              return React.createElement(Box, { 
                key: `option-${index}`, 
                flexDirection: 'row', 
                marginTop: 1,
                paddingX: 2,
                backgroundColor: isSelected ? '#0c272e' : 'transparent'
              }, [
                React.createElement(Text, { 
                  key: 'selector', 
                  color: isSelected ? '#71f2af' : '#c8c8c84d' 
                }, isSelected ? '▶ ' : '  '),
                React.createElement(Text, { 
                  key: 'option-name', 
                  color: isSelected ? 'white' : '#c8c8c84d',
                  bold: isSelected
                }, option.name),
                React.createElement(Text, { 
                  key: 'option-description', 
                  color: '#c8c8c84d',
                  marginLeft: 2
                }, `(${option.description})`)
              ]);
            })
          ),
          
          React.createElement(Text, { key: 'current-selection', color: '#c8c8c84d', marginTop: 2 }, 
            `\nSelected: ${getCurrentValue() || getCurrentOptions()[getCurrentIndex()]?.name || 'none'}`
          )
        ]),
        
        // Progress indicator
        React.createElement(Box, { key: 'progress', flexDirection: 'column', marginTop: 3 }, [
          React.createElement(Text, { key: 'progress-title', color: '#71f2af', bold: true }, 'Configuration Progress:'),
          React.createElement(Box, { key: 'progress-items', flexDirection: 'column', marginLeft: 2 }, [
            React.createElement(Text, { key: 'memory-progress', color: memory ? '#71f2af' : '#c8c8c84d' }, 
              `🧠 Memory: ${memory || 'pending'}`
            ),
            React.createElement(Text, { key: 'cache-progress', color: cache ? '#71f2af' : '#c8c8c84d' }, 
              `⚡ Cache: ${cache || 'pending'}`
            ),
            React.createElement(Text, { key: 'sql-progress', color: sql ? '#71f2af' : '#c8c8c84d' }, 
              `🗄️ SQL: ${sql || 'pending'}`
            )
          ])
        ])
      ])
    ]);
  }
  
  module.exports = { StorageStep };

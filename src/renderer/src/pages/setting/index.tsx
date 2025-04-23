import React, { useState, useEffect, useCallback } from 'react'
import { Model } from '@src/type/model' // 导入模型枚举
import { Container, FormGroup, Label, ApiKeySection, ApiKeyInputGroup } from './style'
import useLocalForage from '@renderer/hooks/useLocalForage'
import TechButton from '@renderer/components/Button'
import TechInput from '@renderer/components/Input'
import TechSelect from '@renderer/components/Select'

const SettingPage: React.FC = () => {
  const { storeSetting, isInit, changeStoreSetting, saveStoreSetting } = useLocalForage()

  const handleModelChange = useCallback(
    (value: Model) => {
      changeStoreSetting({
        ...storeSetting,
        activeModel: value
      })
    },
    [storeSetting, changeStoreSetting]
  )

  const handleApiKeyChange = useCallback(
    (model: Model, e: React.ChangeEvent<HTMLInputElement>) => {
      changeStoreSetting({
        ...storeSetting,
        apiKeys: {
          ...storeSetting.apiKeys,
          [model]: e.target.value
        }
      })
    },
    [storeSetting, changeStoreSetting]
  )

  if (isInit) {
    return <div>初始化中...</div>
  }

  return (
    <Container>
      <h2>设置</h2>

      {/* 选择活动模型 */}
      <FormGroup>
        <Label htmlFor="modelSelect">选择当前使用的翻译模型:</Label>

        <TechSelect
          defaultValue={storeSetting.activeModel}
          onChange={handleModelChange}
          style={{ width: '100%' }}
          placeholder="请选择翻译模型"
        >
          {Object.values(Model).map((modelValue) => (
            <TechSelect.Option key={modelValue} value={modelValue}>
              {modelValue}
            </TechSelect.Option>
          ))}
        </TechSelect>
      </FormGroup>

      {/* 配置各个模型的API Key */}
      <ApiKeySection>
        <Label>配置模型 API Keys:</Label>
        {Object.values(Model).map((modelValue) => (
          <ApiKeyInputGroup key={modelValue}>
            <Label htmlFor={`apiKeyInput-${modelValue}`}>{modelValue} API Key:</Label>
            <TechInput
              defaultValue={storeSetting.apiKeys[modelValue] || ''}
              type="password"
              id={`apiKeyInput-${modelValue}`}
              onChange={(e) => handleApiKeyChange(modelValue, e)}
              placeholder={`请输入 ${modelValue} 的 API Key`}
            />
          </ApiKeyInputGroup>
        ))}
      </ApiKeySection>

      <TechButton type="primary" onClick={saveStoreSetting}>
        保存
      </TechButton>
    </Container>
  )
}

export default SettingPage
